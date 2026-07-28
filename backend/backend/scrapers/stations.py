import io
import logging
from typing import Any

import httpx
import openpyxl

from config import CCR_STATION_LIST_URL, STATION_LIST_XLSX_URL
from database import executemany, fetchone
from scrapers.utils import get_headers, get_with_retry

logger = logging.getLogger(__name__)


def _parse_station_json(data: Any) -> list[dict]:
    """Parse CCR getStationList JSON response into list of station dicts."""
    stations = []

    # CCR returns a list directly or wrapped in a key
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        # Try common wrapper keys
        for key in ("stationList", "stations", "data", "body", "result"):
            if key in data and isinstance(data[key], list):
                items = data[key]
                break
        else:
            logger.warning("Unknown station list JSON structure: %s", list(data.keys()))
            return []
    else:
        logger.warning("Unexpected station list type: %s", type(data))
        return []

    for item in items:
        if not isinstance(item, dict):
            continue
        # Try multiple possible field name variants
        site_id = (
            item.get("siteId") or item.get("site_id") or item.get("stationId")
            or item.get("station_id") or item.get("id")
        )
        name = (
            item.get("stationName") or item.get("station_name") or item.get("name")
            or item.get("siteName") or item.get("site_name")
        )
        city = item.get("city") or item.get("cityName") or item.get("City") or ""
        state = item.get("state") or item.get("stateName") or item.get("State") or ""
        lat = item.get("latitude") or item.get("lat") or item.get("Latitude")
        lng = item.get("longitude") or item.get("lng") or item.get("lon") or item.get("Longitude")

        if not site_id or not name:
            continue

        try:
            lat = float(lat) if lat not in (None, "", "NA") else None
            lng = float(lng) if lng not in (None, "", "NA") else None
        except (ValueError, TypeError):
            lat, lng = None, None

        stations.append({
            "site_id": str(site_id).strip(),
            "name":    str(name).strip(),
            "city":    str(city).strip(),
            "state":   str(state).strip(),
            "latitude":  lat,
            "longitude": lng,
        })

    return stations


def _parse_station_xlsx(raw_bytes: bytes) -> list[dict]:
    """Parse CPCB Station_List.xlsx into list of station dicts."""
    stations = []
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)
    ws = wb.active

    headers = []
    for row in ws.iter_rows(values_only=True):
        if not headers:
            headers = [str(c).strip() if c else "" for c in row]
            continue

        record = dict(zip(headers, row))
        site_id = record.get("SiteId") or record.get("site_id") or record.get("StationId")
        name    = record.get("SiteName") or record.get("StationName") or record.get("name")
        city    = record.get("City") or record.get("city") or ""
        state   = record.get("State") or record.get("state") or ""
        lat     = record.get("Latitude") or record.get("latitude")
        lng     = record.get("Longitude") or record.get("longitude")

        if not site_id or not name:
            continue

        try:
            lat = float(lat) if lat not in (None, "", "NA") else None
            lng = float(lng) if lng not in (None, "", "NA") else None
        except (ValueError, TypeError):
            lat, lng = None, None

        stations.append({
            "site_id":   str(site_id).strip(),
            "name":      str(name).strip(),
            "city":      str(city).strip(),
            "state":     str(state).strip(),
            "latitude":  lat,
            "longitude": lng,
        })

    return stations


async def load_stations() -> int:
    """
    Fetch station list from CCR (JSON), fallback to XLSX.
    Upsert all stations into DB. Returns count of stations loaded.
    """
    stations: list[dict] = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        logger.info("Fetching station list from CCR JSON endpoint…")
        data = await get_with_retry(client, CCR_STATION_LIST_URL)
        if data:
            stations = _parse_station_json(data)
            if stations:
                logger.info("Parsed %d stations from CCR JSON", len(stations))
            else:
                logger.warning("CCR JSON returned 0 parseable stations — falling back to XLSX")

        if not stations:
            logger.info("Fetching station list XLSX fallback…")
            raw = await get_with_retry(client, STATION_LIST_XLSX_URL, as_bytes=True)
            if raw:
                try:
                    stations = _parse_station_xlsx(raw)
                    logger.info("Parsed %d stations from XLSX", len(stations))
                except Exception as exc:
                    logger.error("XLSX parse failed: %s", exc)

    if not stations:
        logger.error("Could not load any stations from any source")
        return 0

    # Upsert
    params = [
        (
            s["site_id"], s["name"], s["city"], s["state"],
            s["latitude"], s["longitude"],
            s["name"], s["city"], s["state"], s["latitude"], s["longitude"],
        )
        for s in stations
    ]

    await executemany(
        """
        INSERT INTO stations (site_id, name, city, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(site_id) DO UPDATE SET
            name      = excluded.name,
            city      = excluded.city,
            state     = excluded.state,
            latitude  = excluded.latitude,
            longitude = excluded.longitude,
            is_active = 1
        """,
        [(s["site_id"], s["name"], s["city"], s["state"], s["latitude"], s["longitude"])
         for s in stations],
    )

    logger.info("Upserted %d stations into DB", len(stations))
    return len(stations)
