import json
import logging
from datetime import datetime, timezone

import httpx

from database import execute, fetchone
from scrapers.cpcb import scrape_all_stations

logger = logging.getLogger(__name__)

_last_run_id: int | None = None


async def run_scrape() -> int | None:
    """
    Full scrape run:
    1. Insert scrape_run record (started_at)
    2. Scrape all stations
    3. Update scrape_run record (completed_at, counts)
    Returns the scrape_run ID.
    """
    global _last_run_id

    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    run_id = await execute(
        "INSERT INTO scrape_runs (started_at, stations_attempted) VALUES (?, 0)",
        (started_at,),
    )
    _last_run_id = run_id
    logger.info("Scrape run #%d started at %s", run_id, started_at)

    errors: list[str] = []
    succeeded = 0
    failed = 0

    try:
        # Count stations before scrape to set attempted count
        row = await fetchone("SELECT COUNT(*) as cnt FROM stations WHERE is_active = 1")
        total = row["cnt"] if row else 0

        await execute(
            "UPDATE scrape_runs SET stations_attempted = ? WHERE id = ?",
            (total, run_id),
        )

        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        ) as client:
            succeeded, failed = await scrape_all_stations(client)

    except Exception as exc:
        msg = f"Fatal error in scrape run #{run_id}: {exc}"
        logger.error(msg, exc_info=True)
        errors.append(msg)

    completed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    try:
        await execute(
            """
            UPDATE scrape_runs
            SET completed_at = ?,
                stations_succeeded = ?,
                stations_failed = ?,
                errors = ?
            WHERE id = ?
            """,
            (completed_at, succeeded, failed, json.dumps(errors), run_id),
        )
    except Exception as exc:
        logger.error("Failed to update scrape_run record #%d: %s", run_id, exc)

    logger.info(
        "Scrape run #%d complete — succeeded=%d failed=%d",
        run_id, succeeded, failed,
    )
    return run_id


async def run_daily_summaries() -> None:
    """
    Compute daily avg/max/min AQI per station for yesterday and upsert into daily_summaries.
    """
    logger.info("Computing daily summaries…")
    try:
        await execute(
            """
            INSERT OR REPLACE INTO daily_summaries (site_id, date, avg_aqi, max_aqi, min_aqi, dominant_pollutant)
            SELECT
                site_id,
                date(reading_timestamp) AS date,
                AVG(aqi)                AS avg_aqi,
                MAX(aqi)                AS max_aqi,
                MIN(aqi)                AS min_aqi,
                (
                    SELECT dominant_pollutant
                    FROM readings r2
                    WHERE r2.site_id = r.site_id
                      AND date(r2.reading_timestamp) = date(r.reading_timestamp)
                      AND r2.aqi = MAX(r.aqi)
                    LIMIT 1
                )                       AS dominant_pollutant
            FROM readings r
            WHERE date(reading_timestamp) = date('now', '-1 day')
              AND aqi IS NOT NULL
            GROUP BY site_id, date(reading_timestamp)
            """,
        )
        logger.info("Daily summaries computed")
    except Exception as exc:
        logger.error("Daily summaries failed: %s", exc)


async def run_weekly_cleanup() -> None:
    """Delete hourly readings older than 90 days. Keep daily_summaries."""
    logger.info("Running weekly cleanup…")
    try:
        await execute(
            "DELETE FROM readings WHERE scraped_at < datetime('now', '-90 days')"
        )
        logger.info("Weekly cleanup complete")
    except Exception as exc:
        logger.error("Weekly cleanup failed: %s", exc)
