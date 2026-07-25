from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str
    db_ok: bool
    last_scrape_at: str | None
    stations_active: int
    total_readings: int
    last_scrape_duration_seconds: float | None


class StationModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    site_id: str
    name: str
    city: str
    state: str
    latitude: float | None
    longitude: float | None
    is_active: bool = True


class StationWithAQI(StationModel):
    latest_aqi: int | None = None
    dominant_pollutant: str | None = None
    updated_at: str | None = None


class CityListItem(BaseModel):
    city: str
    state: str
    station_count: int
    latest_aqi: int | None
    aqi_category: str | None
    dominant_pollutant: str | None
    updated_at: str | None


class CitySummary(BaseModel):
    city: str
    state: str
    current_aqi: int | None
    aqi_category: str | None
    dominant_pollutant: str | None
    health_advisory: str
    stations: list[StationWithAQI]
    updated_at: str | None


class HistoryPoint(BaseModel):
    timestamp: str
    value: float | None


class ReadingModel(BaseModel):
    id: int
    site_id: str
    scraped_at: str
    reading_timestamp: str
    pm25: float | None = None
    pm10: float | None = None
    no2: float | None = None
    so2: float | None = None
    co: float | None = None
    o3: float | None = None
    nh3: float | None = None
    pb: float | None = None
    aqi: int | None = None
    dominant_pollutant: str | None = None


class EditLogItem(BaseModel):
    id: int
    site_id: str
    station_name: str
    city: str
    detected_at: str
    reading_timestamp: str
    field_changed: str
    original_value: float | None
    new_value: float | None
    change_pct: float | None
    severity: str


class EditListResponse(BaseModel):
    items: list[EditLogItem]
    total: int
    page: int
    pages: int


class EditStats(BaseModel):
    total_edits_all_time: int
    edits_this_month: int
    most_edited_city: str | None
    most_edited_station: str | None
    edits_by_severity: dict[str, int]


class LiveStats(BaseModel):
    total_stations: int
    total_readings: int
    edits_caught_today: int
    last_updated: str | None


class ScrapeRunModel(BaseModel):
    id: int
    started_at: str
    completed_at: str | None
    stations_attempted: int
    stations_succeeded: int
    stations_failed: int
    errors: list[str]
