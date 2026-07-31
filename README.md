# AQI Memory

India's permanent air quality archive. Scrapes 560+ CPCB monitoring stations every hour, stores every reading forever, and detects silent retroactive data edits automatically.

**Total cost: $0/month.**

---

## Live stack

| Layer | Service | Free tier |
|---|---|---|
| Database | [Turso](https://turso.tech) | 500 MB · 9 GB bandwidth |
| Backend | [Render](https://render.com) | 750 compute-hours/month |
| Frontend | [Vercel](https://vercel.com) | 100 GB bandwidth · unlimited deploys |
| Keep-alive | [UptimeRobot](https://uptimerobot.com) | 50 monitors · 5-min checks |

**No API key needed for CPCB data** — the scraper hits `app.cpcbccr.com` (the same backend as the official portal) using standard POST requests with no authentication.

---

## Deploy in 4 steps

You do not need to clone or run anything locally. Upload the zip → Turso → Render → Vercel.

---

### Step 1 — Push the code to your GitHub repo

You already have the repo at `github.com/sugumaran-nix/aqi-memory`. Upload the zip contents directly:

**On GitHub.com (no git needed):**

1. Go to `https://github.com/sugumaran-nix/aqi-memory`
2. Click **Add file** → **Upload files**
3. Extract the zip locally, drag all the files/folders into the upload area
4. Set commit message: `feat: premium redesign + Turso DB + zero-cost deploy`
5. Select **Commit directly to `main` branch**
6. Click **Commit changes**

**Or if you have git installed:**

```bash
# Extract the zip, then:
cd aqi-memory-premium
git init
git remote add origin https://github.com/sugumaran-nix/aqi-memory.git
git add -A
git commit -m "feat: premium redesign + Turso DB + zero-cost deploy"
git push origin main --force
```

---

### Step 2 — Create the Turso database

Turso is a hosted SQLite service. Free tier: 500 MB, 9 GB/month bandwidth.

**Install the Turso CLI on your machine:**

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
irm get.tur.so/install.ps1 | iex
```

**Sign up and create the database:**

```bash
# Log in (opens browser)
turso auth login

# Create DB — Singapore region is closest to India's CPCB servers
turso db create aqi-memory --location sin

# Get your connection URL (copy this)
turso db show aqi-memory --url
# Looks like: libsql://aqi-memory-<yourname>.turso.io

# Create an auth token that never expires (copy this too)
turso db tokens create aqi-memory --expiration none
# Looks like: eyJhbGci...  (very long JWT string)
```

Save both values. You need them in Step 3.

> **Verify it works:** `turso db shell aqi-memory "SELECT sqlite_version();"`

---

### Step 3 — Deploy backend on Render

Render hosts the FastAPI backend for free. It runs the hourly scraper and exposes the REST API.

**3.1 — Create a new Web Service**

1. Go to [render.com](https://render.com) → sign in with GitHub
2. Click **New +** → **Web Service**
3. Click **Connect a repository** → authorize GitHub → select your `aqi-memory` fork

**3.2 — Configure the service**

Fill in these exact values:

| Setting | Value |
|---|---|
| **Name** | `aqi-memory-backend` |
| **Region** | Singapore |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --loop uvloop` |
| **Instance Type** | **Free** |

> ⚠️ Do **NOT** add a disk. The database lives on Turso.

**3.3 — Add environment variables**

Click **Advanced** → **Add Environment Variable** for each row:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.4` |
| `TURSO_URL` | `libsql://aqi-memory-<yourname>.turso.io` |
| `TURSO_TOKEN` | `<your-long-jwt-token>` |
| `LOG_LEVEL` | `INFO` |
| `TRUST_PROXY` | `1` |
| `CORS_ORIGINS` | *(leave blank for now — fill after Step 4)* |

**3.4 — Deploy**

Click **Create Web Service**. Watch the **Logs** tab.

First deploy takes **4–8 minutes** — it installs packages, creates the DB schema on Turso, fetches all 563 station names from CPCB, then runs the first full scrape.

A successful startup looks like:
```
=== AQI Memory starting up ===
Database initialized (Turso remote)
Loaded 563 stations
Running initial scrape…
Initial scrape complete
Scheduler started
```

**3.5 — Note your backend URL**

Render gives you a URL like:
```
https://aqi-memory-backend.onrender.com
```

**Verify it works** by opening in your browser:
```
https://aqi-memory-backend.onrender.com/health
```

Expected:
```json
{
  "status": "ok",
  "db_ok": true,
  "stations_active": 563,
  "total_readings": 4500
}
```

If `db_ok` is `false` → your `TURSO_URL` or `TURSO_TOKEN` is wrong. Double-check and redeploy.

---

### Step 4 — Deploy frontend on Vercel

**4.1 — Import your fork**

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. Click **Add New…** → **Project**
3. Find your `aqi-memory` fork → click **Import**

**4.2 — Configure**

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js *(auto-detected)* |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` *(auto-detected)* |
| **Output Directory** | `.next` *(auto-detected)* |

**4.3 — Add environment variables**

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://aqi-memory-backend.onrender.com` |

> No trailing slash. Use the exact Render URL from Step 3.5.

Click **Deploy**. Build takes 1–3 minutes.

**4.4 — Your Vercel URL**

After deploy, copy your Vercel URL:
```
https://aqi-memory-<hash>.vercel.app
```
or your custom project name:
```
https://aqi-memory.vercel.app
```

**4.5 — Cross-link CORS (critical)**

Without this, the frontend can't talk to the backend.

1. Render Dashboard → `aqi-memory-backend` → **Environment**
2. Add: `CORS_ORIGINS` = `https://aqi-memory.vercel.app`
   (use your exact Vercel URL)
3. Render auto-redeploys in ~2 minutes

---

### Step 5 — Prevent Render spin-down (important)

Render free tier **sleeps after 15 minutes of no traffic**. A sleeping backend misses its hourly scrape. Fix this free:

**Option A — UptimeRobot (recommended)**

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. **Add New Monitor**:
   - Type: HTTP(S)
   - URL: `https://aqi-memory-backend.onrender.com/health`
   - Interval: **5 minutes**
3. Add email alert contacts — you'll know if the backend goes down

This keeps Render awake 24/7, free.

**Option B — GitHub Actions (public repos only)**

Already included at `.github/workflows/keepalive.yml`.

1. GitHub repo → **Settings** → **Variables** → **Actions** → **New repository variable**
2. Name: `BACKEND_URL`, Value: `https://aqi-memory-backend.onrender.com`

The workflow pings `/health` every 10 minutes automatically.

> ⚠️ Uses ~4,464 Actions minutes/month. Only free on **public repos** (unlimited minutes). On private repos use UptimeRobot.

---

### Step 6 — Verify everything works

Open your Vercel URL and check:

- [ ] Homepage loads with real station count (563)
- [ ] Stat cards show numbers (not 0 or skeleton forever)
- [ ] City cards have AQI badges with real values
- [ ] `/cities` page loads full list
- [ ] Click a city → city detail page shows AQI gauge and chart
- [ ] `/edits` loads (may show 0 edits on day 1 — that's normal)
- [ ] No "Failed to load" error banners

**DevTools check:**
1. Open DevTools → **Network** tab
2. Filter by your Render URL
3. All requests should return `200`
4. No `CORS` errors in **Console** tab

---

## Continuous deployment

Both services redeploy automatically on every push to `main`:
- **Render**: `autoDeploy: true` in `render.yaml`
- **Vercel**: enabled by default

**Safe workflow:**
```
main    → triggers Render + Vercel production redeploy
dev     → triggers Vercel preview only (no backend redeploy)
```

---

## Custom domain (optional, free)

**Vercel:**
1. Vercel Dashboard → project → **Settings** → **Domains** → add your domain
2. Follow DNS instructions (CNAME or A record at your registrar)
3. SSL is automatic

**After adding custom domain:**
- Update `CORS_ORIGINS` on Render to include your custom domain
- Redeploy Render

---

## Troubleshooting

### "Failed to load cities" on frontend

1. Open DevTools → Network → find the failing request
2. Check the URL — does `NEXT_PUBLIC_API_URL` match your Render URL exactly?
3. Is it a CORS error in Console? → `CORS_ORIGINS` on Render must match your exact Vercel URL
4. Is Render sleeping? → open `https://aqi-memory-backend.onrender.com/health` to wake it, reload after 30s

### `db_ok: false` in health check

1. Open Render logs → search for `Turso` or `libsql`
2. Check `TURSO_URL` starts with `libsql://` (not `https://`)
3. Check `TURSO_TOKEN` is the full JWT (very long string, not truncated)
4. Verify DB is alive: `turso db shell aqi-memory "SELECT COUNT(*) FROM stations;"`

### `stations_active: 0` in health check

CPCB was temporarily down during startup. Fix: Render Dashboard → **Manual Deploy** → **Deploy latest commit**. The startup will retry the station fetch and scrape.

### Render deploy fails at build step

Check that `Root Directory` is set to `backend` (not the repo root). The `requirements.txt` is inside `backend/`.

### Vercel build fails

Check that `Root Directory` is set to `frontend`. The `package.json` is inside `frontend/`.

### Edit tracker shows 0 forever

Normal for the first hour. Edits are detected by comparing two consecutive scrape runs. After the second hourly scrape (~60 min after first startup), the edit detector runs. Check Render logs for `Edit detection logged N changes`.

### Turso storage approaching 500 MB

The 90-day cleanup job runs every Sunday at 03:00 IST automatically. At 563 stations, 90-day rolling storage stays well under 300 MB. If you exceed the free limit, upgrade Turso Starter ($6/month, 10 GB).

---

## Free tier limits

| Service | Limit | This app's usage |
|---|---|---|
| Turso storage | 500 MB | ~280 MB at 90-day rolling cap |
| Turso bandwidth | 9 GB/month | ~1–2 GB/month |
| Render hours | 750/month | ~744/month (one service) |
| Render spin-down | 15 min idle | Fixed by UptimeRobot |
| Vercel bandwidth | 100 GB/month | ~1–2 GB/month |

---

## What's in this repo

```
aqi-memory/
├── backend/                  FastAPI backend
│   ├── main.py               App entry point, lifespan, health endpoint
│   ├── config.py             All constants (CPCB URLs, AQI breakpoints, etc.)
│   ├── database.py           Turso/libsql connection pool
│   ├── schema.sql            Database schema (CREATE TABLE IF NOT EXISTS)
│   ├── models.py             Pydantic response models
│   ├── middleware.py         Rate limiting, CORS, request logging
│   ├── scheduler.py          APScheduler setup (hourly scrape, daily summaries)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── cities.py         /cities, /cities/{city}/summary, /cities/{city}/history
│   │   ├── edits.py          /edits, /edits/stats
│   │   ├── readings.py       /stats/live, /readings/export
│   │   └── stations.py       /stations, /stations/{id}/readings
│   ├── scrapers/
│   │   ├── cpcb.py           Scrapes pollutant data per station from CPCB CCR API
│   │   ├── stations.py       Loads station list from CPCB
│   │   └── utils.py          AQI calculation, HTTP retry, User-Agent rotation
│   └── jobs/
│       ├── hourly_scrape.py  Runs scrape + daily summary + 90-day cleanup
│       └── edit_detector.py  Per-station comparison to detect data mutations
│
├── frontend/                 Next.js 14 frontend
│   ├── src/
│   │   ├── app/              Pages (homepage, /cities, /city/[slug], /edits, /compare, /about)
│   │   ├── components/
│   │   │   ├── ui/           AQIBadge, DiffCard, HealthAdvisory, SkeletonCard, shadcn/ components
│   │   │   ├── magicui/      NumberTicker, AnimatedGradientText, BorderBeam, Marquee
│   │   │   ├── charts/       AQILineChart (Recharts), CitySparkline
│   │   │   └── layout/       Sidebar, TopBar, BottomNav
│   │   ├── lib/              api.ts (SWR hooks), aqi.ts (colors/AQI calc), toast.ts
│   │   └── types/            TypeScript interfaces
│   ├── tailwind.config.js    Custom animations for Magic UI components
│   └── vercel.json           Security headers, asset caching
│
├── render.yaml               Render deploy config (no disk — uses Turso)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml            Type-check + build on every PR
│   │   └── keepalive.yml     Pings /health every 10 min (prevents sleep)
└── README.md                 This file
```

---

## UI libraries used

| Library | What it provides | Cost |
|---|---|---|
| [shadcn/ui](https://ui.shadcn.com) | Button, Card, Badge, Separator, Tooltip | Free, MIT |
| [Tremor](https://tremor.so) | AreaChart, DonutChart, ProgressBar, Metric, BadgeDelta | Free, MIT (backed by Vercel) |
| [Magic UI](https://magicui.design) | NumberTicker, AnimatedGradientText, BorderBeam, Marquee | Free, MIT |
| [Recharts](https://recharts.org) | AQI multi-line chart, city sparklines | Free, MIT |
| [Framer Motion](https://framer.com/motion) | Spring animations for NumberTicker | Free, MIT |
| [Lucide React](https://lucide.dev) | Icons | Free, MIT |

---

## Data source

All data comes from the [CPCB Central Control Room](https://app.cpcbccr.com) — the official backend API for [airquality.cpcb.gov.in](https://airquality.cpcb.gov.in). **No API key required.** The scraper mimics a standard browser POST request to the same endpoint the official website uses.

---

*Built by [sugumaran-nix](https://github.com/sugumaran-nix) · MIT License*
