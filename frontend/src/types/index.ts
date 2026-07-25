export interface Station {
  site_id: string;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  latest_aqi?: number | null;
  dominant_pollutant?: string | null;
  updated_at?: string | null;
}

export interface CityListItem {
  city: string;
  state: string;
  station_count: number;
  latest_aqi: number | null;
  aqi_category: string | null;
  dominant_pollutant: string | null;
  updated_at: string | null;
}

export interface CitySummary {
  city: string;
  state: string;
  current_aqi: number | null;
  aqi_category: string | null;
  dominant_pollutant: string | null;
  health_advisory: string;
  stations: Station[];
  updated_at: string | null;
}

export interface HistoryPoint {
  timestamp: string;
  value: number | null;
}

export interface Reading {
  id: number;
  site_id: string;
  scraped_at: string;
  reading_timestamp: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  nh3: number | null;
  pb: number | null;
  aqi: number | null;
  dominant_pollutant: string | null;
}

export interface EditLogItem {
  id: number;
  site_id: string;
  station_name: string;
  city: string;
  detected_at: string;
  reading_timestamp: string;
  field_changed: string;
  original_value: number | null;
  new_value: number | null;
  change_pct: number | null;
  severity: "minor" | "moderate" | "major";
}

export interface EditListResponse {
  items: EditLogItem[];
  total: number;
  page: number;
  pages: number;
}

export interface EditStats {
  total_edits_all_time: number;
  edits_this_month: number;
  most_edited_city: string | null;
  most_edited_station: string | null;
  edits_by_severity: {
    minor: number;
    moderate: number;
    major: number;
  };
}

export interface LiveStats {
  total_stations: number;
  total_readings: number;
  edits_caught_today: number;
  last_updated: string | null;
}

export interface HealthResponse {
  status: string;
  db_ok: boolean;
  last_scrape_at: string | null;
  stations_active: number;
  total_readings: number;
  last_scrape_duration_seconds: number | null;
}

export type AQICategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export type Pollutant = "pm25" | "pm10" | "no2" | "so2" | "co" | "o3" | "nh3" | "pb";

export interface TimeRange {
  start: string;
  end: string;
}
