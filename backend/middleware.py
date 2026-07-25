"""
Security headers, rate limiting, and request ID middleware.
All in-memory — no external dependencies required.
"""
import time
import uuid
from collections import defaultdict
from threading import Lock

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


# ---------------------------------------------------------------------------
# Rate limiter — sliding window, in-memory
# ---------------------------------------------------------------------------

class _RateLimiter:
    """Thread-safe sliding-window rate limiter keyed by IP."""

    def __init__(self, max_calls: int, window_seconds: float) -> None:
        self.max_calls = max_calls
        self.window = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, key: str) -> tuple[bool, int]:
        """
        Returns (allowed, retry_after_seconds).
        retry_after is 0 when allowed.
        """
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            calls = self._store[key]
            # Evict old entries
            self._store[key] = [t for t in calls if t > cutoff]
            if len(self._store[key]) < self.max_calls:
                self._store[key].append(now)
                return True, 0
            oldest = self._store[key][0]
            retry_after = int(oldest + self.window - now) + 1
            return False, retry_after

    def cleanup(self) -> None:
        """Remove entries for IPs that haven't made requests recently."""
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            stale = [k for k, ts in self._store.items() if not any(t > cutoff for t in ts)]
            for k in stale:
                del self._store[k]


# 200 requests / minute per IP (generous for a public data API)
_api_limiter = _RateLimiter(max_calls=200, window_seconds=60.0)

# Scrape export endpoints are heavier — 10 / minute per IP
_export_limiter = _RateLimiter(max_calls=10, window_seconds=60.0)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# ---------------------------------------------------------------------------
# Middleware classes
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach security headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add X-Request-ID to every response for log correlation."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Per-IP rate limiting.
    Export endpoints: 10/min.
    All other API endpoints: 200/min.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for docs, health, and preflight
        path = request.url.path
        if path in ("/docs", "/redoc", "/openapi.json", "/health") or request.method == "OPTIONS":
            return await call_next(request)

        ip = _get_client_ip(request)
        limiter = _export_limiter if "/export" in path else _api_limiter
        allowed, retry_after = limiter.is_allowed(ip)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please slow down.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
