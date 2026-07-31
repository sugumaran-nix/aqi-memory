"""
cpcb.py — CPCB CCR scraper

Two-phase design:
  Phase 1 (HTTP): fetch pollutant data for all stations, semaphore-limited
                  to MAX_CONCURRENT_SCRAPERS. No DB connections held.
  Phase 2 (DB):   write all results in a single executemany batch.
                  Uses only ONE DB connection for the entire scrape run.

This keeps Turso connection usage at 1 during the scrape, leaving the other
2 free-tier connections available for the FastAPI router.
"""

import asyncio
import logging
from datetime import datetime, timezone

import httpx

from config import (
    CCR_DATA_URL,
    MAX_CONCURRENT_SCRAPERS,
    POLLUTANT_FIELD_MAP,
    POLLUTANTS,
)
from database import executemany, fetchall
from scrapers.utils import calculate_aqi, get_headers, post_with_retry, random_delay

logger = logging.getLogger(__name__)

_semaphore: asyncio.Semaphore | None = None


def get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCRAPERS)
    return _semaphore


# ── Phase 1: HTTP fetch ───────────────────────────────────────────────────────

async def _fetch_station(site_id: str, client: httpx.AsyncClient) -> dict | None:
    """
    Fetch all pollutants for one station from CPCB CCR.
    Pure HTTP — no DB calls. Returns a row dict or None on failure.
    """
    pollutant_values: dict[str, float | None] = {}
    reading_timestamp: str | None = None

    for pollutant in POLLUTANTS:
        payload = {
            "site_id":   site_id,
            "parameter": pollutant,
        }
        try:
            data = await post_with_retry(client, CCR_DATA_URL, payload)
        except Exception as exc:
            logger.warning("Fetch error site=%s pollutant=%s: %s", site_id, pollutant, exc)
            pollutant_values[POLLUTANT_FIELD_MAP[pollutant]] = None
            continue

        if not data:
            pollutant_values[POLLUTANT_FIELD_MAP[pollutant]] = None
            continue

        # Parse concentration value
        try:
            records = data.get("data", data) if isinstance(data, dict) else data
            if isinstance(records, list) and records:
                latest = records[-1]
                raw = latest.get("concentration") or latest.get("value")
                pollutant_values[POLLUTANT_FIELD_MAP[pollutant]] = float(raw) if raw is not None else None
                if reading_timestamp is None:
                    ts = latest.get("to_date") or latest.get("from_date") or latest.get("date")
                    if ts:
                        reading_timestamp = str(ts)
            else:
                pollutant_values[POLLUTANT_FIELD_MAP[pollutant]] = None
        except (ValueError, TypeError, KeyError):
            pollutant_values[POLLUTANT_FIELD_MAP[pollutant]] = None

        if pollutant != POLLUTANTS[-1]:
            await random_delay()

    if reading_timestamp is None:
        reading_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    aqi, dominant_pollutant = calculate_aqi(pollutant_values)

    return {
        "site_id":           site_id,
        "scraped_at":        datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "reading_timestamp": reading_timestamp,
        **pollutant_values,
        "aqi":               aqi,
        "dominant_pollutant": dominant_pollutant,
    }


async def _fetch_with_sem(site_id: str, client: httpx.AsyncClient) -> dict | None:
    async with get_semaphore():
        return await _fetch_station(site_id, client)


# ── Phase 2: DB write (single batch) ─────────────────────────────────────────

async def _write_readings(rows: list[dict]) -> int:
    """
    Write all fetched readings to Turso in ONE executemany call.
    Uses a single DB connection for the entire batch.
    """
    if not rows:
        return 0

    params = [
        (
            r["site_id"], r["scraped_at"], r["reading_timestamp"],
            r.get("pm25"), r.get("pm10"), r.get("no2"), r.get("so2"),
            r.get("co"),   r.get("o3"),   r.get("nh3"), r.get("pb"),
            r.get("aqi"),  r.get("dominant_pollutant"),
        )
        for r in rows
    ]

    await executemany(
        """
        INSERT OR IGNORE INTO readings
            (site_id, scraped_at, reading_timestamp,
             pm25, pm10, no2, so2, co, o3, nh3, pb,
             aqi, dominant_pollutant)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        params,
    )
    return len(params)


# ── Main entry point ──────────────────────────────────────────────────────────

async def scrape_all_stations(client: httpx.AsyncClient) -> tuple[int, int]:
    """
    Two-phase scrape:
      1. Fetch all station data via HTTP (semaphore-limited, no DB connections).
      2. Write all results in one batch (single DB connection).

    Returns (succeeded, failed).
    """
    rows = await fetchall(
        "SELECT site_id FROM stations WHERE is_active = 1 ORDER BY site_id"
    )
    site_ids = [r["site_id"] for r in rows]

    if not site_ids:
        logger.warning("No active stations in DB — skipping scrape")
        return 0, 0

    logger.info("Phase 1: fetching %d stations (HTTP only)…", len(site_ids))

    # Phase 1: concurrent HTTP fetches — no DB connections held
    tasks = [asyncio.create_task(_fetch_with_sem(sid, client)) for sid in site_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    succeeded_rows: list[dict] = []
    failed = 0
    for r in results:
        if isinstance(r, Exception):
            logger.error("Station fetch raised: %s", r)
            failed += 1
        elif r is None:
            failed += 1
        else:
            succeeded_rows.append(r)

    logger.info("Phase 1 done: %d fetched, %d failed", len(succeeded_rows), failed)

    # Phase 2: single-batch DB write
    if succeeded_rows:
        logger.info("Phase 2: writing %d readings to Turso…", len(succeeded_rows))
        written = await _write_readings(succeeded_rows)
        logger.info("Phase 2 done: %d rows written", written)

    failure_rate = failed / len(site_ids) if site_ids else 0
    if failure_rate > 0.5:
        logger.critical(
            "HIGH FAILURE RATE %.0f%% — %d/%d stations failed",
            failure_rate * 100, failed, len(site_ids),
        )

    return len(succeeded_rows), failed
