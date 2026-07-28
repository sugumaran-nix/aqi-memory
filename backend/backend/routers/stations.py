import logging

from fastapi import APIRouter, HTTPException, Query

from database import fetchall
from models import ReadingModel, StationModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stations", tags=["stations"])


@router.get("", response_model=list[StationModel])
async def list_stations(
    state: str | None = Query(None),
    active_only: bool = Query(True),
):
    conditions = []
    params: list = []

    if active_only:
        conditions.append("is_active = 1")
    if state:
        conditions.append("LOWER(state) = LOWER(?)")
        params.append(state)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    rows = await fetchall(
        f"SELECT site_id, name, city, state, latitude, longitude, is_active FROM stations {where} ORDER BY city, name",
        tuple(params),
    )

    return [
        StationModel(
            site_id=r["site_id"],
            name=r["name"],
            city=r["city"],
            state=r["state"],
            latitude=r["latitude"],
            longitude=r["longitude"],
            is_active=bool(r["is_active"]),
        )
        for r in rows
    ]


@router.get("/{site_id}/readings", response_model=list[ReadingModel])
async def station_readings(
    site_id: str,
    limit: int = Query(24, ge=1, le=720),
):
    # Verify station exists
    from database import fetchone
    st = await fetchone("SELECT site_id FROM stations WHERE site_id = ?", (site_id,))
    if not st:
        raise HTTPException(status_code=404, detail=f"Station not found: {site_id}")

    rows = await fetchall(
        """
        SELECT id, site_id, scraped_at, reading_timestamp,
               pm25, pm10, no2, so2, co, o3, nh3, pb, aqi, dominant_pollutant
        FROM readings
        WHERE site_id = ?
        ORDER BY scraped_at DESC
        LIMIT ?
        """,
        (site_id, limit),
    )

    return [ReadingModel(**r) for r in rows]
