import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import CORS_ORIGINS, LOG_LEVEL
from database import close_pool, fetchone, init_db
from middleware import RateLimitMiddleware, RequestIDMiddleware, SecurityHeadersMiddleware
from models import HealthResponse
from routers import cities, edits, readings, stations

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s [%(funcName)s]: %(message)s",
)
logger = logging.getLogger(__name__)

os.makedirs("data", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ------------------------------------------------------------------ #
    # STARTUP — must finish fast so Render's port scanner sees us in time  #
    # ------------------------------------------------------------------ #
    logger.info("=== AQI Memory starting up ===")

    # 1. Init DB schema (pure local disk, fast)
    await init_db()
    logger.info("Database ready")

    # 2. Start scheduler — station loading + first scrape happen inside it
    #    as background jobs, NOT blocking startup
    from scheduler import start_scheduler
    scheduler = await start_scheduler()

    logger.info("=== Startup complete — server ready ===")

    yield

    # ------------------------------------------------------------------ #
    # SHUTDOWN                                                             #
    # ------------------------------------------------------------------ #
    scheduler.shutdown(wait=False)
    await close_pool()
    logger.info("=== AQI Memory shutdown complete ===")


app = FastAPI(
    title="AQI Memory API",
    description="India's air quality archive — scraping CPCB data and detecting silent edits.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "Content-Disposition"],
)


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


# ---------------------------------------------------------------------------
# Core routes
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return {"name": "AQI Memory API", "docs": "/docs"}


@app.get("/ping", include_in_schema=False)
async def ping():
    return {"ok": True}


@app.get("/health", response_model=HealthResponse)
async def health():
    try:
        row = await fetchone("SELECT COUNT(*) AS cnt FROM stations WHERE is_active = 1")
        active = row["cnt"] if row else 0
        db_ok = True
    except Exception:
        active = 0
        db_ok = False
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        db_ok=db_ok,
        stations_active=active,
    )


# ---------------------------------------------------------------------------
# Routers (prefix already defined on each router)
# ---------------------------------------------------------------------------

app.include_router(cities.router)
app.include_router(edits.router)
app.include_router(readings.router)
app.include_router(stations.router)
