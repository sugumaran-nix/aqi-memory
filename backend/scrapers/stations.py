import io
import logging
from typing import Any

import httpx
import openpyxl

from config import CCR_STATION_LIST_URL, STATION_LIST_XLSX_URL
from database import executemany, fetchone
from scrapers.utils import get_headers

logger = logging.getLogger(__name__)

# Alternative CPCB URLs to try (first one that works wins)
STATION_LIST_URLS = [
    ("json", "https://app.cpcbccr.com/caaqms/getStationList"),
    ("json", "https://airquality.cpcb.gov.in/caaqms/getStationList"),
    ("xlsx", "https://airquality.cpcb.gov.in/caaqms/download?filename=Station_List.xlsx"),
    ("xlsx", "https://app.cpcbccr.com/caaqms/download?filename=Station_List.xlsx"),
]


def _parse_station_json(data: Any) -> list[dict]:
    stations = []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        for key in ("stationList", "stations", "data", "body", "result"):
            if key in data and isinstance(data[key], list):
                items = data[key]
                break
        else:
            return []
    else:
        return []

    for item in items:
        if not isinstance(item, dict):
            continue
        site_id = (item.get("siteId") or item.get("site_id") or item.get("stationId")
                   or item.get("station_id") or item.get("id"))
        name = (item.get("stationName") or item.get("station_name") or item.get("name")
                or item.get("siteName") or item.get("site_name"))
        city  = item.get("city") or item.get("cityName") or item.get("City") or ""
        state = item.get("state") or item.get("stateName") or item.get("State") or ""
        lat   = item.get("latitude") or item.get("lat") or item.get("Latitude")
        lng   = item.get("longitude") or item.get("lng") or item.get("lon") or item.get("Longitude")

        if not site_id or not name:
            continue
        try:
            lat = float(lat) if lat not in (None, "", "NA") else None
            lng = float(lng) if lng not in (None, "", "NA") else None
        except (ValueError, TypeError):
            lat, lng = None, None

        stations.append({
            "site_id": str(site_id).strip(), "name": str(name).strip(),
            "city": str(city).strip(), "state": str(state).strip(),
            "latitude": lat, "longitude": lng,
        })
    return stations


def _parse_station_xlsx(raw_bytes: bytes) -> list[dict]:
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
            "site_id": str(site_id).strip(), "name": str(name).strip(),
            "city": str(city).strip(), "state": str(state).strip(),
            "latitude": lat, "longitude": lng,
        })
    return stations


async def load_stations() -> int:
    """
    Try multiple CPCB URLs to get station list.
    Returns count loaded. Never raises — server must keep running even if this fails.
    """
    # If we already have stations in DB, don't re-fetch on every restart
    existing = await fetchone("SELECT COUNT(*) AS cnt FROM stations WHERE is_active = 1")
    if existing and existing["cnt"] > 0:
        logger.info("Stations already in DB (%d) — skipping fetch", existing["cnt"])
        return existing["cnt"]

    stations: list[dict] = []

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(30.0, connect=10.0),
    ) as client:
        for fmt, url in STATION_LIST_URLS:
            logger.info("Trying station list: %s", url)
            try:
                resp = await client.get(url, headers=get_headers())
                if resp.status_code != 200:
                    logger.warning("Got %d from %s — trying next", resp.status_code, url)
                    continue

                if fmt == "json":
                    try:
                        data = resp.json()
                        stations = _parse_station_json(data)
                    except Exception as e:
                        logger.warning("JSON parse failed for %s: %s", url, e)
                        continue
                else:
                    try:
                        stations = _parse_station_xlsx(resp.content)
                    except Exception as e:
                        logger.warning("XLSX parse failed for %s: %s", url, e)
                        continue

                if stations:
                    logger.info("Got %d stations from %s", len(stations), url)
                    break
                else:
                    logger.warning("0 stations parsed from %s", url)

            except Exception as e:
                logger.warning("Request failed for %s: %s", url, e)
                continue

    if not stations:
        logger.error("Could not load stations from any source — will retry next hour")
        return 0

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
