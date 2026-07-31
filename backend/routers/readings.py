import csv
import io
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from database import fetchall, fetchone
from models import LiveStats

logger = logging.getLogger(__name__)
router = APIRouter(tags=["readings"])


@router.get("/stats/live", response_model=LiveStats)
async def live_stats():
    stations    = await fetchone("SELECT COUNT(*) AS cnt FROM stations WHERE is_active = 1")
    readings    = await fetchone("SELECT COUNT(*) AS cnt FROM readings")
    today       = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    edits_today = await fetchone(
        "SELECT COUNT(*) AS cnt FROM edit_log WHERE detected_at >= ?",
        (today + " 00:00:00",),
    )
    last_scrape = await fetchone("SELECT MAX(scraped_at) AS ts FROM readings")
    return LiveStats(
        total_stations     = stations["cnt"]    if stations    else 0,
        total_readings     = readings["cnt"]    if readings    else 0,
        edits_caught_today = edits_today["cnt"] if edits_today else 0,
        last_updated       = last_scrape["ts"]  if last_scrape else None,
    )


@router.get("/readings/export")
async def export_readings(
    city:       str | None = Query(None),
    start_date: str | None = Query(None),
    end_date:   str | None = Query(None),
    station_id: str | None = Query(None),
):
    now = datetime.now(timezone.utc)
    if not end_date:
        end_date   = now.strftime("%Y-%m-%d")
    if not start_date:
        start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    conditions = ["r.reading_timestamp BETWEEN ? AND ?"]
    params: list = [start_date + " 00:00:00", end_date + " 23:59:59"]

    if city:
        conditions.append("LOWER(s.city) = LOWER(?)")
        params.append(city)
    if station_id:
        conditions.append("r.site_id = ?")
        params.append(station_id)

    where = "WHERE " + " AND ".join(conditions)

    # Fetch all rows then stream — Turso doesn't support row-by-row streaming
    # but CSV exports are bounded by the 7-day default window
    rows = await fetchall(
        f"""
        SELECT
            r.reading_timestamp, s.city, s.name AS station,
            r.pm25, r.pm10, r.no2, r.so2, r.co, r.o3, r.nh3, r.pb,
            r.aqi, r.dominant_pollutant
        FROM readings r
        JOIN stations s ON r.site_id = s.site_id
        {where}
        ORDER BY r.reading_timestamp
        """,
        tuple(params),
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["timestamp","city","station","pm25","pm10","no2","so2","co","o3","nh3","pb","aqi","dominant_pollutant"])
    for row in rows:
        writer.writerow([
            row["reading_timestamp"], row["city"], row["station"],
            row["pm25"], row["pm10"], row["no2"], row["so2"],
            row["co"],  row["o3"],  row["nh3"],  row["pb"],
            row["aqi"], row["dominant_pollutant"],
        ])
    buf.seek(0)

    filename = f"aqi_memory_export_{start_date}_{end_date}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
