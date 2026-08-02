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
from scrapers.stations import load_stations
from jobs.hourly_scrape import run_scrape

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s [%(funcName)s]: %(message)s",
)
logger = logging.getLogger(__name__)

os.makedirs("data", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== AQI Memory starting up ===")
    await init_db()
    logger.info("Database ready")

    station_count = await load_stations()
    logger.info("Loaded %d stations", station_count)

    if station_count > 0:
        logger.info("Running initial scrape…")
        await run_scrape()
        logger.info("Initial scrape complete")
    else:
        logger.warning("No stations loaded — skipping initial scrape")

    from scheduler import start_scheduler
    scheduler = await start_scheduler()

    yield

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

# Middleware — order matters: outer wraps inner
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],           # Read-only API — no POST/PUT/DELETE from browser
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "Content-Disposition"],
)


# ---------------------------------------------------------------------------
# Structured error handlers
# ---------------------------------------------------------------------------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(l) for l in e["loc"]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": errors},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(cities.router)
app.include_router(stations.router)
app.include_router(readings.router)
app.include_router(edits.router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health():
    db_ok = False
    last_scrape_at = None
    stations_active = 0
    total_readings = 0
    last_scrape_duration = None

    try:
        row = await fetchone("SELECT 1 AS ok")
        db_ok = row is not None and row.get("ok") == 1
    except Exception as exc:
        logger.error("Health DB check failed: %s", exc)

    try:
        r = await fetchone("SELECT COUNT(*) AS cnt FROM stations WHERE is_active = 1")
        stations_active = r["cnt"] if r else 0
    except Exception:
        pass

    try:
        r = await fetchone("SELECT COUNT(*) AS cnt FROM readings")
        total_readings = r["cnt"] if r else 0
    except Exception:
        pass

    try:
        r = await fetchone(
            """
            SELECT MAX(scraped_at) AS ts,
                   MAX(
                       CAST((julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER)
                   ) AS duration
            FROM scrape_runs
            WHERE completed_at IS NOT NULL
            """
        )
        if r:
            last_scrape_at = r["ts"]
            last_scrape_duration = r["duration"]
    except Exception:
        pass

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        db_ok=db_ok,
        last_scrape_at=last_scrape_at,
        stations_active=stations_active,
        total_readings=total_readings,
        last_scrape_duration_seconds=last_scrape_duration,
    )
