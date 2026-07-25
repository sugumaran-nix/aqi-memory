CREATE TABLE IF NOT EXISTS stations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id     TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    city        TEXT NOT NULL,
    state       TEXT NOT NULL,
    latitude    REAL,
    longitude   REAL,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id             TEXT NOT NULL,
    scraped_at          TEXT NOT NULL,
    reading_timestamp   TEXT NOT NULL,
    pm25                REAL,
    pm10                REAL,
    no2                 REAL,
    so2                 REAL,
    co                  REAL,
    o3                  REAL,
    nh3                 REAL,
    pb                  REAL,
    aqi                 INTEGER,
    dominant_pollutant  TEXT,
    UNIQUE(site_id, reading_timestamp, scraped_at)
);

CREATE TABLE IF NOT EXISTS edit_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id             TEXT NOT NULL,
    detected_at         TEXT NOT NULL,
    reading_timestamp   TEXT NOT NULL,
    field_changed       TEXT NOT NULL,
    original_value      REAL,
    new_value           REAL,
    change_pct          REAL,
    severity            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scrape_runs (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at           TEXT NOT NULL,
    completed_at         TEXT,
    stations_attempted   INTEGER DEFAULT 0,
    stations_succeeded   INTEGER DEFAULT 0,
    stations_failed      INTEGER DEFAULT 0,
    errors               TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS daily_summaries (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id             TEXT NOT NULL,
    date                TEXT NOT NULL,
    avg_aqi             REAL,
    max_aqi             INTEGER,
    min_aqi             INTEGER,
    dominant_pollutant  TEXT,
    UNIQUE(site_id, date)
);

CREATE INDEX IF NOT EXISTS idx_readings_site_ts   ON readings(site_id, reading_timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_scraped   ON readings(scraped_at);
CREATE INDEX IF NOT EXISTS idx_edits_detected     ON edit_log(detected_at);
CREATE INDEX IF NOT EXISTS idx_edits_site         ON edit_log(site_id);
CREATE INDEX IF NOT EXISTS idx_daily_site_date    ON daily_summaries(site_id, date);
