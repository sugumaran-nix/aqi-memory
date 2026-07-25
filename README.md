# AQI Memory

**India's air quality record. Unedited. Forever.**

Scrapes 560+ CPCB monitoring stations every hour, archives every reading permanently, and detects when government portals silently edit or delete already-published data.

---

## Architecture

```
Backend:  Python 3.11 · FastAPI · SQLite (aiosqlite) · APScheduler · httpx
Frontend: Next.js 14 · TypeScript · Tailwind CSS · Recharts · SWR
Data:     CPCB CCR JSON API (no API keys, no paid services)
```

---

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Backend

```bash
cd backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server (creates DB, loads stations, runs initial scrape automatically)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
1. Create `data/aqi_memory.db` with all tables
2. Fetch the CPCB station list (560+ stations)
3. Run the first full scrape immediately
4. Start the hourly scheduler

Health check: http://localhost:8000/health

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Copy env file
cp .env.local.example .env.local

# Install and start
npm install
npm run dev
```

Open: http://localhost:3000

---

## Environment variables

### Backend

| Variable       | Default                    | Description                        |
|----------------|----------------------------|------------------------------------|
| `DB_PATH`      | `data/aqi_memory.db`       | SQLite database path               |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated allowed origins    |
| `LOG_LEVEL`    | `INFO`                     | Python logging level               |

### Frontend

| Variable                | Default                  | Description              |
|-------------------------|--------------------------|--------------------------|
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8000`  | Backend API base URL     |

---

## API endpoints

| Method | Path                          | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/health`                     | System health + last scrape info     |
| GET    | `/cities`                     | All cities with latest AQI           |
| GET    | `/cities/{city}/summary`      | City summary with stations           |
| GET    | `/cities/{city}/history`      | Historical AQI/pollutant data        |
| GET    | `/stations`                   | All stations with lat/lng            |
| GET    | `/stations/{site_id}/readings`| Latest N readings for a station      |
| GET    | `/edits`                      | Paginated edit log                   |
| GET    | `/edits/stats`                | Edit statistics                      |
| GET    | `/stats/live`                 | Live counts for homepage             |
| GET    | `/readings/export`            | Streaming CSV export                 |

---

## Data sources

All data comes from CPCB's Central Control Room (CCR) backend:

- **Station list**: `GET https://app.cpcbccr.com/caaqms/getStationList`
- **Readings**: `POST https://app.cpcbccr.com/caaqms/getStationData`
- **XLSX fallback**: `https://airquality.cpcb.gov.in/caaqms/download?filename=Station_List.xlsx`

No API keys. No paid services. Zero external dependencies beyond CPCB's own endpoints.

---

## Scheduler

| Job               | Schedule           | Action                                         |
|-------------------|--------------------|------------------------------------------------|
| Hourly scrape     | Every hour, :00    | Scrape all 560+ stations (semaphore-limited)   |
| Edit detection    | 5 min after scrape | Compare latest vs previous scrape run          |
| Daily summaries   | 00:30 IST          | Compute avg/max/min AQI per station per day    |
| Weekly cleanup    | Sunday 03:00 IST   | Delete hourly readings older than 90 days      |

---

## Edit detection

Every reading is archived with two timestamps:
- `reading_timestamp` — when CPCB says the measurement was taken
- `scraped_at` — when we retrieved it

After each scrape, we compare every `(site_id, reading_timestamp)` pair against the previous run. Any changed numeric value is logged in `edit_log` with:

- Original value
- New value  
- Percentage change
- Severity: `minor` (<5%), `moderate` (5–20%), `major` (>20%)
- `deleted` severity (major) when a reading_timestamp disappears entirely

---

## Project structure

```
aqi-memory/
├── backend/
│   ├── main.py              # FastAPI app, lifespan, CORS
│   ├── scheduler.py         # APScheduler jobs
│   ├── database.py          # Connection pool, query helpers
│   ├── schema.sql           # Table definitions + indexes
│   ├── config.py            # All configuration + constants
│   ├── models.py            # Pydantic v2 response models
│   ├── scrapers/
│   │   ├── cpcb.py          # Station scraper, 8 pollutants
│   │   ├── stations.py      # Station list loader
│   │   └── utils.py         # Retry, AQI calc, header rotation
│   ├── jobs/
│   │   ├── hourly_scrape.py # Scrape orchestration
│   │   └── edit_detector.py # Edit comparison logic
│   └── routers/
│       ├── cities.py
│       ├── stations.py
│       ├── readings.py
│       └── edits.py
└── frontend/
    └── src/
        ├── app/             # Next.js App Router pages
        ├── components/      # UI + chart components
        ├── lib/             # API hooks, AQI helpers
        └── types/           # TypeScript interfaces
```

---

## Deployment

### Backend (Render)

- Runtime: Python 3.11
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Persistent disk: mount at `/data`, set `DB_PATH=/data/aqi_memory.db`
- Set `CORS_ORIGINS` to your Vercel frontend URL

### Frontend (Vercel)

- Framework: Next.js
- Root directory: `frontend`
- Set `NEXT_PUBLIC_API_URL` to your Render backend URL

---

## AQI color reference

| Range    | Category    | Color     |
|----------|-------------|-----------|
| 0–50     | Good        | `#00B050` |
| 51–100   | Satisfactory| `#92D050` |
| 101–200  | Moderate    | `#FFFF00` |
| 201–300  | Poor        | `#FF9900` |
| 301–400  | Very Poor   | `#FF0000` |
| 401–500  | Severe      | `#800000` |
