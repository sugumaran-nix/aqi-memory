import logging
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from config import HEALTH_ADVISORIES
from database import fetchall, fetchone
from models import CityListItem, CitySummary, HistoryPoint, StationWithAQI
from scrapers.utils import get_aqi_category

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cities", tags=["cities"])

# 5-minute module-level cache
_cities_cache: dict = {}
_cities_cache_ts: float = 0.0
CITIES_CACHE_TTL = 300  # seconds


def _to_ist(utc_str: str | None) -> str | None:
    """Convert UTC datetime string to IST (+5:30)."""
    if not utc_str:
        return None
    try:
        dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist = dt + timedelta(hours=5, minutes=30)
        return ist.strftime("%Y-%m-%d %H:%M:%S IST")
    except Exception:
        return utc_str


@router.get("", response_model=list[CityListItem])
async def list_cities():
    global _cities_cache, _cities_cache_ts

    now = time.time()
    if now - _cities_cache_ts < CITIES_CACHE_TTL and _cities_cache:
        return list(_cities_cache.values())

    rows = await fetchall(
        """
        SELECT
            s.city,
            s.state,
            COUNT(DISTINCT s.site_id)                           AS station_count,
            AVG(r.aqi)                                          AS latest_aqi_raw,
            (
                SELECT r2.dominant_pollutant
                FROM readings r2
                JOIN stations s2 ON r2.site_id = s2.site_id
                WHERE s2.city = s.city
                  AND r2.scraped_at = (
                      SELECT MAX(r3.scraped_at) FROM readings r3
                      JOIN stations s3 ON r3.site_id = s3.site_id
                      WHERE s3.city = s.city
                  )
                  AND r2.dominant_pollutant IS NOT NULL
                GROUP BY r2.dominant_pollutant
                ORDER BY COUNT(*) DESC
                LIMIT 1
            )                                                   AS dominant_pollutant,
            MAX(r.scraped_at)                                   AS updated_at
        FROM stations s
        LEFT JOIN readings r ON s.site_id = r.site_id
            AND r.scraped_at = (
                SELECT MAX(r4.scraped_at) FROM readings r4 WHERE r4.site_id = s.site_id
            )
        WHERE s.is_active = 1
        GROUP BY s.city, s.state
        ORDER BY s.city
        """
    )

    result = []
    for row in rows:
        aqi = round(row["latest_aqi_raw"]) if row["latest_aqi_raw"] is not None else None
        result.append(CityListItem(
            city=row["city"],
            state=row["state"],
            station_count=row["station_count"],
            latest_aqi=aqi,
            aqi_category=get_aqi_category(aqi),
            dominant_pollutant=row["dominant_pollutant"],
            updated_at=_to_ist(row["updated_at"]),
        ))

    _cities_cache = {r.city: r for r in result}
    _cities_cache_ts = now

    return result


@router.get("/{city}/summary", response_model=CitySummary)
async def city_summary(city: str):
    stations = await fetchall(
        "SELECT * FROM stations WHERE LOWER(city) = LOWER(?) AND is_active = 1",
        (city,),
    )
    if not stations:
        raise HTTPException(status_code=404, detail=f"City not found: {city}")

    state = stations[0]["state"]
    station_aqis = []
    station_list = []

    for st in stations:
        reading = await fetchone(
            """
            SELECT aqi, dominant_pollutant, scraped_at
            FROM readings
            WHERE site_id = ?
            ORDER BY scraped_at DESC
            LIMIT 1
            """,
            (st["site_id"],),
        )
        aqi = reading["aqi"] if reading else None
        dp = reading["dominant_pollutant"] if reading else None
        upd = _to_ist(reading["scraped_at"]) if reading else None

        if aqi is not None:
            station_aqis.append(aqi)

        station_list.append(StationWithAQI(
            site_id=st["site_id"],
            name=st["name"],
            city=st["city"],
            state=st["state"],
            latitude=st["latitude"],
            longitude=st["longitude"],
            is_active=bool(st["is_active"]),
            latest_aqi=aqi,
            dominant_pollutant=dp,
            updated_at=upd,
        ))

    current_aqi = round(sum(station_aqis) / len(station_aqis)) if station_aqis else None
    category = get_aqi_category(current_aqi)
    advisory = HEALTH_ADVISORIES.get(category, "") if category else ""

    # Dominant pollutant = most frequent across stations
    dp_counts: dict[str, int] = {}
    for s in station_list:
        if s.dominant_pollutant:
            dp_counts[s.dominant_pollutant] = dp_counts.get(s.dominant_pollutant, 0) + 1
    dominant = max(dp_counts, key=lambda k: dp_counts[k]) if dp_counts else None

    updated_ats = [s.updated_at for s in station_list if s.updated_at]
    updated_at = max(updated_ats) if updated_ats else None

    return CitySummary(
        city=city,
        state=state,
        current_aqi=current_aqi,
        aqi_category=category,
        dominant_pollutant=dominant,
        health_advisory=advisory,
        stations=station_list,
        updated_at=updated_at,
    )


@router.get("/{city}/history", response_model=list[HistoryPoint])
async def city_history(
    city: str,
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    station_id: str | None = Query(None),
    pollutant: str = Query("aqi"),
):
    # Validate pollutant
    valid_fields = {"aqi", "pm25", "pm10", "no2", "so2", "co", "o3", "nh3", "pb"}
    if pollutant not in valid_fields:
        raise HTTPException(status_code=422, detail=f"Invalid pollutant: {pollutant}")

    # Defaults and 90-day cap
    now = datetime.now(timezone.utc)
    if not end_date:
        end_date = now.strftime("%Y-%m-%d")
    if not start_date:
        start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    start_dt = datetime.fromisoformat(start_date)
    end_dt = datetime.fromisoformat(end_date)
    if (end_dt - start_dt).days > 90:
        raise HTTPException(status_code=422, detail="Max range is 90 days")

    if station_id:
        rows = await fetchall(
            f"""
            SELECT reading_timestamp AS ts, {pollutant} AS val
            FROM readings
            WHERE site_id = ?
              AND reading_timestamp BETWEEN ? AND ?
              AND {pollutant} IS NOT NULL
            ORDER BY reading_timestamp
            """,
            (station_id, start_date + " 00:00:00", end_date + " 23:59:59"),
        )
    else:
        rows = await fetchall(
            f"""
            SELECT
                reading_timestamp           AS ts,
                AVG({pollutant})            AS val
            FROM readings r
            JOIN stations s ON r.site_id = s.site_id
            WHERE LOWER(s.city) = LOWER(?)
              AND r.reading_timestamp BETWEEN ? AND ?
              AND r.{pollutant} IS NOT NULL
            GROUP BY reading_timestamp
            ORDER BY reading_timestamp
            """,
            (city, start_date + " 00:00:00", end_date + " 23:59:59"),
        )

    return [
        HistoryPoint(timestamp=_to_ist(r["ts"]) or r["ts"], value=r["val"])
        for r in rows
    ]
