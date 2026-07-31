# AQI Memory — Complete Free Deployment Guide

**Total monthly cost: $0**

| Service | What it does | Free tier |
|---|---|---|
| **Turso** | Hosted SQLite database | 500 MB · 9 GB bandwidth/month |
| **Render** | FastAPI backend + cron jobs | 750 compute-hours/month |
| **Vercel** | Next.js frontend | 100 GB bandwidth · unlimited deploys |
| **UptimeRobot** | Prevents Render spin-down | 50 monitors · 5-min checks |
| **GitHub Actions** | CI on every PR | Unlimited on public repos |

---

## Architecture

```
User
 │
 ▼
Vercel (Next.js)          — static at edge, global CDN
 │  REST calls
 ▼
Render (FastAPI)          — Singapore region, free web service
 │  libsql over WebSocket
 ▼
Turso (SQLite)            — hosted, 500 MB free
 │
 └── scrapes every hour ──► CPCB API (India govt)

UptimeRobot → Render /health every 5 min (prevents spin-down)
```

---

## Step 0 — Prerequisites

Before you start, you need:

```bash
# Turso CLI (manages your database from terminal)
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login    # Opens browser — sign in with GitHub

# Verify CLI works
turso --version
```

You also need accounts at (all free, no card required):
- [render.com](https://render.com) — sign up with GitHub
- [vercel.com](https://vercel.com) — sign up with GitHub
- [uptimerobot.com](https://uptimerobot.com) — sign up with email

---

## Step 1 — Push the premium code to GitHub

```bash
# If you haven't pushed yet:
cd aqi-memory
git remote set-url origin https://github.com/sugumaran-nix/aqi-memory.git

# Copy the premium files over your existing repo
# (replace frontend/src, backend, render.yaml, vercel.json, .github/)

git add -A
git commit -m "feat: premium redesign + Turso DB + zero-cost deploy"
git push origin main
```

Make the repo **public** if you want unlimited GitHub Actions minutes (the keepalive workflow needs ~4,464 min/month).

---

## Step 2 — Create the Turso Database

```bash
# Create DB in Singapore (closest to India's CPCB servers)
turso db create aqi-memory --location sin

# Get your connection URL
turso db show aqi-memory --url
# Output looks like:
# libsql://aqi-memory-sugumaran-nix.turso.io

# Create an auth token (long-lived)
turso db tokens create aqi-memory --expiration none
# Output: a long JWT string — copy it immediately
```

Save both values somewhere safe. You'll need them in Step 3.

**Verify the DB is reachable:**
```bash
turso db shell aqi-memory "SELECT sqlite_version();"
# Should print: 3.45.x or similar
```

---

## Step 3 — Deploy Backend on Render

### 3.1 Create the Web Service

1. Go to **render.com** → **New** → **Web Service**
2. Click **Connect a repository** → authorize GitHub → select `aqi-memory`

### 3.2 Fill in the service settings

| Field | Value |
|---|---|
| Name | `aqi-memory-backend` |
| Region | **Singapore** |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | **Python 3** |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --loop uvloop` |
| Plan | **Free** |

> ⚠️ Do **not** add a disk. There is no disk section in the new `render.yaml` — the database is on Turso.

### 3.3 Add environment variables

Click **Advanced** → **Add Environment Variable** for each:

| Key | Value | Notes |
|---|---|---|
| `PYTHON_VERSION` | `3.11.4` | Required — Render won't auto-detect |
| `TURSO_URL` | `libsql://aqi-memory-<you>.turso.io` | From Step 2 |
| `TURSO_TOKEN` | `<your-jwt>` | From Step 2 |
| `LOG_LEVEL` | `INFO` | |
| `TRUST_PROXY` | `1` | Render runs behind a load balancer |
| `CORS_ORIGINS` | *(leave blank for now — fill after Step 4)* | |

### 3.4 Deploy

Click **Create Web Service**. Watch the **Logs** tab.

**First deploy takes 4–8 minutes** — it installs packages, initialises the Turso DB schema, fetches all 560+ station names from CPCB, then runs the first full scrape.

Successful startup log:
```
=== AQI Memory starting up ===
Database initialized (Turso remote)
Loaded 563 stations
Running initial scrape…
Initial scrape complete
Scheduler started — hourly scrape, daily summaries, weekly cleanup
```

### 3.5 Note your backend URL

Render assigns a URL like:
```
https://aqi-memory-backend.onrender.com
```

Open it to confirm:
```
https://aqi-memory-backend.onrender.com/health
```

Expected:
```json
{
  "status": "ok",
  "db_ok": true,
  "stations_active": 563,
  "total_readings": 4500,
  "last_scrape_at": "2026-07-28 06:00:00",
  "last_scrape_duration_seconds": 84
}
```

**Troubleshooting:**
- `db_ok: false` → double-check `TURSO_URL` starts with `libsql://` and token has no extra spaces
- `stations_active: 0` → CPCB was temporarily down; click **Manual Deploy** in Render to retry

---

## Step 4 — Deploy Frontend on Vercel

### 4.1 Import project

1. Go to **vercel.com** → **Add New** → **Project**
2. Click **Import Git Repository** → select `aqi-memory`

### 4.2 Configure

| Field | Value |
|---|---|
| Framework Preset | **Next.js** |
| Root Directory | `frontend` |
| Build Command | `npm run build` *(auto-detected)* |
| Output Directory | `.next` *(auto-detected)* |

### 4.3 Add environment variables

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://aqi-memory-backend.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | *(leave blank — fill after deploy)* |

Click **Deploy**. Build takes 1–3 minutes.

After deploy, copy your Vercel URL:
```
https://aqi-memory.vercel.app
```

### 4.4 Set remaining env vars

**On Render** — add `CORS_ORIGINS`:
1. Render Dashboard → `aqi-memory-backend` → **Environment**
2. Add: `CORS_ORIGINS` = `https://aqi-memory.vercel.app`
3. Render auto-redeploys in ~2 minutes

**On Vercel** — add `NEXT_PUBLIC_SITE_URL`:
1. Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Add: `NEXT_PUBLIC_SITE_URL` = `https://aqi-memory.vercel.app`
3. Go to **Deployments** → latest → **⋯** → **Redeploy**

---

## Step 5 — Prevent Render Spin-Down

Render free tier sleeps after **15 minutes of inactivity**. A sleeping backend misses the hourly scrape. Fix this with a free uptime monitor.

### Option A — UptimeRobot (recommended, easiest)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Click **Add New Monitor**
3. Fill in:
   - Monitor type: **HTTP(S)**
   - Friendly name: `AQI Memory Backend`
   - URL: `https://aqi-memory-backend.onrender.com/health`
   - Monitoring interval: **5 minutes**
4. Click **Create Monitor**
5. Add your email to **Alert Contacts** — you'll get notified if the backend goes down

This ping every 5 minutes keeps Render awake 24/7 for free.

### Option B — GitHub Actions (for public repos only)

Already included in `.github/workflows/keepalive.yml`. Just add one repository variable:

1. GitHub repo → **Settings** → **Variables** → **Actions** → **New repository variable**
2. Name: `BACKEND_URL`
3. Value: `https://aqi-memory-backend.onrender.com`

The workflow runs every 10 minutes automatically.

> ⚠️ This uses ~4,464 Actions minutes/month. Fine for public repos (unlimited free minutes). For private repos — use UptimeRobot instead.

---

## Step 6 — Verify End-to-End

Open your Vercel URL and check everything:

**Homepage**
- [ ] Hero section loads (no blank page)
- [ ] Stat bar shows real numbers (563 stations, not 0)
- [ ] "Latest edits caught" table renders (may be empty on day 1)
- [ ] City spotlight cards show AQI values with coloured badges

**Cities page** (`/cities`)
- [ ] Full list of Indian cities loads
- [ ] Search filter works
- [ ] AQI sort works

**City detail** (`/city/delhi`)
- [ ] AQI badge shows current value
- [ ] Sparkline chart renders
- [ ] Health advisory banner appears (if AQI > 100)

**Edit tracker** (`/edits`)
- [ ] Page loads without error
- [ ] Stats row shows numbers (may all be 0 on day 1 — edits appear after 2 scrape cycles)

**DevTools check (important)**
1. Open DevTools → **Network** tab
2. Filter by your Render URL
3. All requests should return `200`
4. No `CORS` errors in the **Console** tab

---

## Step 7 — Custom Domain (optional, free)

### Vercel custom domain

1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g. `aqimemory.in`)
3. Follow the DNS instructions (CNAME or A record)
4. SSL is automatic (Let's Encrypt)

### Update env vars after adding domain

- Render: update `CORS_ORIGINS` to include your custom domain
- Vercel: update `NEXT_PUBLIC_SITE_URL` to your custom domain

---

## Free Tier Limits

### Storage estimate (Turso 500 MB limit)

| Table | Size per day | Per month |
|---|---|---|
| `readings` (563 stations × 24 readings × 13 columns) | ~3.1 MB | ~93 MB |
| `edit_log` | ~0.1 MB | ~3 MB |
| `daily_summaries` | ~0.05 MB | ~1.5 MB |
| `stations` (one-time) | ~0.2 MB | static |

**Without cleanup:** hits 500 MB in ~5 months  
**With 90-day cleanup** (already coded): steady state ~280 MB, stays free indefinitely

The weekly cleanup job runs every Sunday at 03:00 IST automatically — no action needed.

### Render 750 hours/month

One free service × 744 hours/month = fits exactly. Don't create a second free service on the same account or you'll run short.

### Vercel bandwidth

Your site is mostly JSON API calls (≤5 KB each) and static Next.js assets (cached). 100 GB/month is effectively unlimited for this app.

---

## Local Development

No Turso account needed locally — the backend falls back to a local SQLite file automatically when `TURSO_URL` is unset.

```bash
# Terminal 1 — Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# No env vars needed — uses ./data/aqi_memory.db locally
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
# → http://localhost:3000
```

The first startup fetches all stations from CPCB and runs a scrape — takes ~2 minutes.

---

## Continuous Deployment

Both services auto-deploy on push to `main`:
- **Render**: `autoDeploy: true` in `render.yaml`
- **Vercel**: enabled by default

Recommended workflow:
```bash
# Feature work
git checkout -b my-feature
git push origin my-feature
# → Vercel creates a preview URL automatically

# Merge to main
git checkout main
git merge my-feature
git push origin main
# → Both Render and Vercel redeploy automatically
```

---

## Troubleshooting

### "Failed to load" on the frontend

1. Open DevTools → Network → find the failing request
2. Is it `net::ERR_CONNECTION_REFUSED`? → Render is sleeping. Open `/health` in browser to wake it, reload after 30 seconds.
3. Is it a CORS error in the Console? → Check `CORS_ORIGINS` on Render includes your exact Vercel URL (no trailing slash)
4. Is it a `422` or `500`? → Open Render logs and search for the error

### Backend won't start — `libsql` import error

```bash
# The package name is libsql-client (with hyphen), not libsql
pip show libsql-client
# Should show version 0.3.1
```

If missing: `pip install libsql-client==0.3.1`

### `db_ok: false` in health check

1. In Render logs: search for `Turso` or `libsql`
2. Verify `TURSO_URL` format: must start with `libsql://` (not `https://`)
3. Verify `TURSO_TOKEN` is set and not truncated
4. Test the DB directly:
   ```bash
   turso db shell aqi-memory "SELECT COUNT(*) FROM stations;"
   ```
   If this fails, the DB itself has an issue — recreate it with `turso db create`

### Turso quota warning in logs

Sign in to [app.turso.tech](https://app.turso.tech) → check your DB usage. If over 400 MB:
- The 90-day cleanup job should be running automatically (Sundays 03:00 IST)
- Trigger it manually: Render Dashboard → **Shell** (on paid plan) or wait for next Sunday
- If still growing: upgrade Turso Starter ($6/month, 10 GB)

### Edit tracker shows 0 edits permanently

This is normal for the first 1–2 hours. Edits are detected by comparing two consecutive scrape runs. After the second hourly scrape completes, the edit detector runs and any changes appear.

If still empty after 24 hours and CPCB edits are expected:
- Check Render logs for `Edit detection logged N changes`
- Check Turso shell: `SELECT COUNT(*) FROM edit_log;`

### Render deploy fails at build step

```bash
# Test locally first
cd backend
pip install -r requirements.txt
python -m py_compile main.py config.py database.py middleware.py models.py scheduler.py \
  routers/cities.py routers/edits.py routers/readings.py routers/stations.py \
  jobs/edit_detector.py jobs/hourly_scrape.py \
  scrapers/cpcb.py scrapers/stations.py scrapers/utils.py
```

All files should compile silently. Any output = syntax error to fix.

### Vercel build fails with TypeScript errors

```bash
cd frontend
npm run type-check    # or: npx tsc --noEmit
```

Fix locally, push. The CI workflow also catches this on every PR.

