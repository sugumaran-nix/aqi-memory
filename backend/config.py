import os

# ── Database (Turso) ─────────────────────────────────────────────────────────
TURSO_URL   = os.getenv("TURSO_URL", "")    # libsql://<db>.turso.io  (empty = local file)
TURSO_TOKEN = os.getenv("TURSO_TOKEN", "")  # JWT auth token

# ── Server ───────────────────────────────────────────────────────────────────
LOG_LEVEL        = os.getenv("LOG_LEVEL", "INFO")

# CORS: default to "*" so the backend works before CORS_ORIGINS is set on Render.
# After Vercel deploy, set CORS_ORIGINS=https://your-app.vercel.app in Render env.
_raw = os.getenv("CORS_ORIGINS", "*").strip()
if _raw == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

TRUST_PROXY = os.getenv("TRUST_PROXY", "").lower() in ("1", "true", "yes")

# ── Scraper ──────────────────────────────────────────────────────────────────
SCRAPE_INTERVAL_MINUTES = 60
MAX_CONCURRENT_SCRAPERS = 3
REQUEST_DELAY_MIN       = 2.0
REQUEST_DELAY_MAX       = 4.0
MAX_RETRIES             = 3

CCR_DATA_URL          = "https://app.cpcbccr.com/caaqms/getStationData"
CCR_STATION_LIST_URL  = "https://app.cpcbccr.com/caaqms/getStationList"
STATION_LIST_XLSX_URL = "https://airquality.cpcb.gov.in/caaqms/download?filename=Station_List.xlsx"

POLLUTANTS = ["PM2.5", "PM10", "NO2", "SO2", "CO", "Ozone", "NH3", "Lead"]

POLLUTANT_FIELD_MAP = {
    "PM2.5": "pm25",
    "PM10":  "pm10",
    "NO2":   "no2",
    "SO2":   "so2",
    "CO":    "co",
    "Ozone": "o3",
    "NH3":   "nh3",
    "Lead":  "pb",
}

USER_AGENTS = [
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
]

# ── AQI ──────────────────────────────────────────────────────────────────────
AQI_CATEGORIES = [
    (50,  "Good",         "#00B050"),
    (100, "Satisfactory", "#92D050"),
    (200, "Moderate",     "#FFFF00"),
    (300, "Poor",         "#FF9900"),
    (400, "Very Poor",    "#FF0000"),
    (500, "Severe",       "#800000"),
]

AQI_BREAKPOINTS: dict = {
    "pm25": {"conc": [0, 30,  60,  90,  120, 250],    "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "pm10": {"conc": [0, 50, 100, 250,  350, 430],    "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "no2":  {"conc": [0, 40,  80, 180,  280, 400],    "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "so2":  {"conc": [0, 40,  80, 380,  800, 1600],   "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "co":   {"conc": [0,  1,   2,  10,   17,   34],   "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "o3":   {"conc": [0, 50, 100, 168,  208,  748],   "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "nh3":  {"conc": [0, 200, 400, 800, 1200, 1800],  "aqi": [0, 50, 100, 200, 300, 400, 500]},
    "pb":   {"conc": [0, 0.5, 1.0, 2.0,  3.0,  3.5], "aqi": [0, 50, 100, 200, 300, 400, 500]},
}

HEALTH_ADVISORIES = {
    "Good":         "Air quality is good. No health precautions needed.",
    "Satisfactory": "Air quality is acceptable. Unusually sensitive people should limit outdoor exertion.",
    "Moderate":     "People with respiratory or heart conditions should reduce outdoor activity.",
    "Poor":         "Everyone may experience health effects. Sensitive groups should avoid outdoor activity.",
    "Very Poor":    "Health alert. Everyone should avoid prolonged outdoor exertion.",
    "Severe":       "Health emergency. Everyone should avoid all outdoor activity.",
}
