import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from database import fetchall, fetchone
from models import EditListResponse, EditLogItem, EditStats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/edits", tags=["edits"])


@router.get("", response_model=EditListResponse)
async def list_edits(
    city: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    severity: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    now = datetime.now(timezone.utc)
    if not end_date:
        end_date = now.strftime("%Y-%m-%d")
    if not start_date:
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    conditions = ["e.detected_at BETWEEN ? AND ?"]
    params: list = [start_date + " 00:00:00", end_date + " 23:59:59"]

    if city:
        conditions.append("LOWER(s.city) = LOWER(?)")
        params.append(city)
    if severity and severity in ("minor", "moderate", "major"):
        conditions.append("e.severity = ?")
        params.append(severity)

    where = "WHERE " + " AND ".join(conditions)

    count_row = await fetchone(
        f"""
        SELECT COUNT(*) AS cnt
        FROM edit_log e
        JOIN stations s ON e.site_id = s.site_id
        {where}
        """,
        tuple(params),
    )
    total = count_row["cnt"] if count_row else 0
    pages = max(1, (total + per_page - 1) // per_page)
    offset = (page - 1) * per_page

    rows = await fetchall(
        f"""
        SELECT
            e.id, e.site_id, s.name AS station_name, s.city,
            e.detected_at, e.reading_timestamp,
            e.field_changed, e.original_value, e.new_value,
            e.change_pct, e.severity
        FROM edit_log e
        JOIN stations s ON e.site_id = s.site_id
        {where}
        ORDER BY e.detected_at DESC
        LIMIT ? OFFSET ?
        """,
        tuple(params) + (per_page, offset),
    )

    items = [
        EditLogItem(
            id=r["id"],
            site_id=r["site_id"],
            station_name=r["station_name"],
            city=r["city"],
            detected_at=r["detected_at"],
            reading_timestamp=r["reading_timestamp"],
            field_changed=r["field_changed"],
            original_value=r["original_value"],
            new_value=r["new_value"],
            change_pct=r["change_pct"],
            severity=r["severity"],
        )
        for r in rows
    ]

    return EditListResponse(items=items, total=total, page=page, pages=pages)


@router.get("/stats", response_model=EditStats)
async def edit_stats():
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1).strftime("%Y-%m-%d") + " 00:00:00"

    total = await fetchone("SELECT COUNT(*) AS cnt FROM edit_log")
    this_month = await fetchone(
        "SELECT COUNT(*) AS cnt FROM edit_log WHERE detected_at >= ?",
        (month_start,),
    )

    most_city = await fetchone(
        """
        SELECT s.city, COUNT(*) AS cnt
        FROM edit_log e JOIN stations s ON e.site_id = s.site_id
        GROUP BY s.city ORDER BY cnt DESC LIMIT 1
        """
    )
    most_station = await fetchone(
        """
        SELECT s.name, COUNT(*) AS cnt
        FROM edit_log e JOIN stations s ON e.site_id = s.site_id
        GROUP BY s.name ORDER BY cnt DESC LIMIT 1
        """
    )

    severity_rows = await fetchall(
        "SELECT severity, COUNT(*) AS cnt FROM edit_log GROUP BY severity"
    )
    by_severity = {r["severity"]: r["cnt"] for r in severity_rows}

    return EditStats(
        total_edits_all_time=total["cnt"] if total else 0,
        edits_this_month=this_month["cnt"] if this_month else 0,
        most_edited_city=most_city["city"] if most_city else None,
        most_edited_station=most_station["name"] if most_station else None,
        edits_by_severity={
            "minor":    by_severity.get("minor", 0),
            "moderate": by_severity.get("moderate", 0),
            "major":    by_severity.get("major", 0),
        },
    )
