import logging
from datetime import datetime, timezone

from database import execute, fetchall, fetchone

logger = logging.getLogger(__name__)

NUMERIC_FIELDS = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3", "pb", "aqi"]


def _severity(change_pct: float) -> str:
    if change_pct < 5.0:
        return "minor"
    elif change_pct <= 20.0:
        return "moderate"
    return "major"


async def run_edit_detection() -> int:
    """
    Compare the latest scrape run against the previous one.
    For every reading_timestamp that appears in both runs, check if any numeric field changed.
    For reading_timestamps present in previous run but absent in latest, log as deleted.
    Returns count of edits logged.
    """
    logger.info("Running edit detection…")
    detected_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    edits_logged = 0

    try:
        # Get the two most recent distinct scrape times
        scrape_times = await fetchall(
            """
            SELECT DISTINCT scraped_at
            FROM readings
            ORDER BY scraped_at DESC
            LIMIT 2
            """
        )

        if len(scrape_times) < 2:
            logger.info("Not enough scrape runs for edit detection yet")
            return 0

        current_scrape = scrape_times[0]["scraped_at"]
        previous_scrape = scrape_times[1]["scraped_at"]

        logger.info(
            "Comparing scrape %s (current) vs %s (previous)",
            current_scrape, previous_scrape,
        )

        # Fetch all current readings
        current_readings = await fetchall(
            """
            SELECT site_id, reading_timestamp, pm25, pm10, no2, so2, co, o3, nh3, pb, aqi
            FROM readings
            WHERE scraped_at = ?
            """,
            (current_scrape,),
        )

        # Fetch all previous readings
        previous_readings = await fetchall(
            """
            SELECT site_id, reading_timestamp, pm25, pm10, no2, so2, co, o3, nh3, pb, aqi
            FROM readings
            WHERE scraped_at = ?
            """,
            (previous_scrape,),
        )

        # Build lookup: (site_id, reading_timestamp) → row
        current_map: dict[tuple, dict] = {
            (r["site_id"], r["reading_timestamp"]): r for r in current_readings
        }
        previous_map: dict[tuple, dict] = {
            (r["site_id"], r["reading_timestamp"]): r for r in previous_readings
        }

        edit_inserts: list[tuple] = []

        # Check for changed values
        for key, prev_row in previous_map.items():
            curr_row = current_map.get(key)
            site_id, reading_timestamp = key

            if curr_row is None:
                # Reading disappeared — log as deleted
                prev_aqi = prev_row.get("aqi")
                edit_inserts.append((
                    site_id, detected_at, reading_timestamp,
                    "deleted", prev_aqi, None, None, "major",
                ))
                continue

            for field in NUMERIC_FIELDS:
                old_val = prev_row.get(field)
                new_val = curr_row.get(field)

                if old_val is None and new_val is None:
                    continue
                if old_val == new_val:
                    continue

                # Both present, values differ
                if old_val is not None and new_val is not None:
                    try:
                        old_f = float(old_val)
                        new_f = float(new_val)
                        if old_f == 0:
                            change_pct = 100.0 if new_f != 0 else 0.0
                        else:
                            change_pct = abs(new_f - old_f) / abs(old_f) * 100.0
                        sev = _severity(change_pct)
                        edit_inserts.append((
                            site_id, detected_at, reading_timestamp,
                            field, old_f, new_f, round(change_pct, 2), sev,
                        ))
                    except (ValueError, TypeError) as exc:
                        logger.debug("Could not compare field %s: %s", field, exc)

        # Bulk insert edits
        if edit_inserts:
            from database import executemany
            await executemany(
                """
                INSERT INTO edit_log
                    (site_id, detected_at, reading_timestamp, field_changed,
                     original_value, new_value, change_pct, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                edit_inserts,
            )
            edits_logged = len(edit_inserts)
            logger.info("Edit detection logged %d changes", edits_logged)
        else:
            logger.info("No data edits detected")

    except Exception as exc:
        logger.error("Edit detection failed: %s", exc, exc_info=True)

    return edits_logged
