import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from config import (
    CCR_DATA_URL,
    MAX_CONCURRENT_SCRAPERS,
    POLLUTANT_FIELD_MAP,
    POLLUTANTS,
)
from database import execute, fetchall
from scrapers.utils import calculate_aqi, post_with_retry, random_delay

logger = logging.getLogger(__name__)

_semaphore: asyncio.Semaphore | None = None


def get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCRAPERS)
    return _semaphore


def _parse_pollutant_response(data: Any, pollutant: str) -> tuple[float | None, str | None]:
    """
    Parse CCR getStationData response.
    Returns (avg_value, reading_timestamp) or (None, None).
    """
    if not isinstance(data, dict):
        logger.debug("Non-dict response for %s: %s", pollutant, type(data))
        return None, None

    # CCR may wrap in various keys
    body = data
    for key in ("body", "data", "result", "stationData"):
        if key in data and isinstance(data[key], dict):
            body = data[key]
            break
        elif key in data and isinstance(data[key], list) and data[key]:
            body = data[key][0]
            break

    # Extract average value
    avg_val = None
    for key in ("avgValue", "avg_value", "average", "value", "concentration"):
        v = body.get(key)
        if v not in (None, "", "NA", "---", "N/A"):
            try:
                avg_val = float(v)
                break
            except (ValueError, TypeError):
                continue

    # Extract reading timestamp
    ts = None
    for key in ("requestTime", "request_time", "timestamp", "time", "date", "lastUpdated"):
        t = body.get(key)
        if t and str(t).strip() not in ("", "NA", "N/A"):
            ts = str(t).strip()
            break

    return avg_val, ts


async def scrape_station(site_id: str, client: httpx.AsyncClient) -> dict | None:
    """
    Scrape all 8 pollutants for a single station.
    Never raises — all exceptions caught and logged.
    Returns dict of {field: value, ...} + aqi + dominant_pollutant, or None on total failure.
    """
    try:
        pollutant_values: dict[str, float | None] = {}
        reading_timestamp: str | None = None

        for pollutant in POLLUTANTS:
            field = POLLUTANT_FIELD_MAP[pollutant]
            payload = {"siteId": site_id, "parameterName": pollutant}

            try:
                data = await post_with_retry(client, CCR_DATA_URL, payload)
            except Exception as exc:
                logger.warning("Post error site=%s pollutant=%s: %s", site_id, pollutant, exc)
                pollutant_values[field] = None
                await random_delay()
                continue

            if data is None:
                logger.debug("No data for site=%s pollutant=%s", site_id, pollutant)
                pollutant_values[field] = None
            else:
                value, ts = _parse_pollutant_response(data, pollutant)
                pollutant_values[field] = value
                if ts and reading_timestamp is None:
                    reading_timestamp = ts

            # Be polite — delay between pollutant requests for same station
            if pollutant != POLLUTANTS[-1]:
                await random_delay()

        # If we got no timestamp at all, use scrape time
        if reading_timestamp is None:
            reading_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        aqi, dominant_pollutant = calculate_aqi(pollutant_values)

        scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        try:
            await execute(
                """
                INSERT OR IGNORE INTO readings
                    (site_id, scraped_at, reading_timestamp,
                     pm25, pm10, no2, so2, co, o3, nh3, pb,
                     aqi, dominant_pollutant)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    site_id, scraped_at, reading_timestamp,
                    pollutant_values.get("pm25"),
                    pollutant_values.get("pm10"),
                    pollutant_values.get("no2"),
                    pollutant_values.get("so2"),
                    pollutant_values.get("co"),
                    pollutant_values.get("o3"),
                    pollutant_values.get("nh3"),
                    pollutant_values.get("pb"),
                    aqi, dominant_pollutant,
                ),
            )
        except Exception as db_exc:
            logger.error("DB write error for site=%s: %s", site_id, db_exc)
            # Don't abort — return the data anyway

        return {
            "site_id": site_id,
            "scraped_at": scraped_at,
            "reading_timestamp": reading_timestamp,
            **pollutant_values,
            "aqi": aqi,
            "dominant_pollutant": dominant_pollutant,
        }

    except Exception as exc:
        logger.error("Unexpected error scraping site=%s: %s", site_id, exc, exc_info=True)
        return None


async def scrape_all_stations(client: httpx.AsyncClient) -> tuple[int, int]:
    """
    Scrape all active stations concurrently (semaphore-limited).
    Returns (succeeded, failed).
    """
    rows = await fetchall(
        "SELECT site_id FROM stations WHERE is_active = 1 ORDER BY city, name"
    )
    site_ids = [r["site_id"] for r in rows]

    if not site_ids:
        logger.warning("No active stations in DB — skipping scrape")
        return 0, 0

    logger.info("Starting scrape of %d stations…", len(site_ids))

    sem = get_semaphore()
    succeeded = 0
    failed = 0

    async def _scrape_with_sem(site_id: str) -> bool:
        async with sem:
            result = await scrape_station(site_id, client)
            return result is not None

    tasks = [asyncio.create_task(_scrape_with_sem(sid)) for sid in site_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            failed += 1
        elif r:
            succeeded += 1
        else:
            failed += 1

    failure_rate = failed / len(site_ids) if site_ids else 0
    if failure_rate > 0.5:
        logger.critical(
            "SCRAPE FAILURE RATE %.0f%% — %d/%d stations failed",
            failure_rate * 100, failed, len(site_ids),
        )

    logger.info("Scrape complete: %d succeeded, %d failed", succeeded, failed)
    return succeeded, failed
