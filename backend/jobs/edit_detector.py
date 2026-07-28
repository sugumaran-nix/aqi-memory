import logging
from datetime import datetime, timezone

from database import execute, executemany, fetchall, fetchone

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

    FIX Bug 9: previously compared global top-2 scraped_at values, which meant
    stations with a stale last-scrape could be compared against themselves (same
    run in both slots) or against a mismatched run for other stations, producing
    false positives. Now we compare per-station: for each station we take ITS
    own two most recent distinct scraped_at values.

    FIX Bug 8: uses INSERT OR IGNORE so re-running detection on the same scrape
    pair doesn't duplicate edit_log rows.

    Returns count of edits logged.
    """
    logger.info("Running edit detection…")
    detected_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    edits_logged = 0

    try:
        # Get all active stations
        stations = await fetchall(
            "SELECT site_id FROM stations WHERE is_active = 1"
        )
        if not stations:
            logger.info("No active stations — skipping edit detection")
            return 0

        edit_inserts: list[tuple] = []

        for station_row in stations:
            site_id = station_row["site_id"]

            # FIX Bug 9: get the two most recent scraped_at FOR THIS STATION only
            scrape_times = await fetchall(
                """
                SELECT DISTINCT scraped_at
                FROM readings
                WHERE site_id = ?
                ORDER BY scraped_at DESC
                LIMIT 2
                """,
                (site_id,),
            )

            if len(scrape_times) < 2:
                continue  # Not enough history for this station yet

            current_scrape = scrape_times[0]["scraped_at"]
            previous_scrape = scrape_times[1]["scraped_at"]

            # Skip if both slots point at the same timestamp (shouldn't happen, but guard)
            if current_scrape == previous_scrape:
                continue

            current_readings = await fetchall(
                """
                SELECT reading_timestamp, pm25, pm10, no2, so2, co, o3, nh3, pb, aqi
                FROM readings
                WHERE site_id = ? AND scraped_at = ?
                """,
                (site_id, current_scrape),
            )
            previous_readings = await fetchall(
                """
                SELECT reading_timestamp, pm25, pm10, no2, so2, co, o3, nh3, pb, aqi
                FROM readings
                WHERE site_id = ? AND scraped_at = ?
                """,
                (site_id, previous_scrape),
            )

            current_map = {r["reading_timestamp"]: r for r in current_readings}
            previous_map = {r["reading_timestamp"]: r for r in previous_readings}

            for reading_ts, prev_row in previous_map.items():
                curr_row = current_map.get(reading_ts)

                if curr_row is None:
                    # Reading disappeared — log as deleted
                    prev_aqi = prev_row.get("aqi")
                    edit_inserts.append((
                        site_id, detected_at, reading_ts,
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
                                site_id, detected_at, reading_ts,
                                field, old_f, new_f, round(change_pct, 2), sev,
                            ))
                        except (ValueError, TypeError) as exc:
                            logger.debug("Could not compare field %s: %s", field, exc)

        # FIX Bug 8: INSERT OR IGNORE prevents duplicate edits on re-runs.
        # Requires a UNIQUE constraint on edit_log — see schema.sql note.
        if edit_inserts:
            await executemany(
                """
                INSERT OR IGNORE INTO edit_log
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
