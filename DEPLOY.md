# AQI Memory — Deployment Guide

Complete step-by-step guide to deploy backend on Render + frontend on Vercel.

---

## Prerequisites

- GitHub account with the repo pushed
- [Render](https://render.com) account (free tier)
- [Vercel](https://vercel.com) account (free tier)

---

## Part 1 — Backend on Render

### Step 1: Create a Web Service

1. Go to [render.com/new](https://render.com/new) → **New Web Service**
2. Connect your GitHub repo
3. Configure:

| Field            | Value                                           |
|------------------|-------------------------------------------------|
| **Name**         | `aqi-memory-backend`                            |
| **Region**       | Singapore (lowest latency to CPCB servers)      |
| **Branch**       | `main`                                          |
| **Root Dir**     | `backend`                                       |
| **Runtime**      | Python 3                                        |
| **Build Cmd**    | `pip install -r requirements.txt`               |
| **Start Cmd**    | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1` |
| **Plan**         | Free (or Starter for persistent disk)           |

### Step 2: Add Persistent Disk

> **Critical**: Without this, the SQLite database is wiped on every deploy.

1. In your service → **Disks** → **Add Disk**
2. Configure:

| Field        | Value              |
|--------------|--------------------|
| Name         | `aqi-data`         |
| Mount Path   | `/data`            |
| Size         | 1 GB (free tier max) |

### Step 3: Set Environment Variables

In Render dashboard → **Environment**:

| Key              | Value                         | Notes                           |
|------------------|-------------------------------|---------------------------------|
| `PYTHON_VERSION` | `3.11.4`                      | Required                        |
| `DB_PATH`        | `/data/aqi_memory.db`         | Must match disk mount path      |
| `LOG_LEVEL`      | `INFO`                        |                                 |
| `CORS_ORIGINS`   | *(set after Vercel deploy)*   | e.g. `https://yourapp.vercel.app` |

### Step 4: Deploy

Click **Deploy Web Service**. First deploy takes 3–5 minutes.

Watch logs for:
```
Database ready
Loaded 560 stations
Running initial scrape…
Initial scrape complete
Scheduler started
```

**Health check**: `https://your-service.onrender.com/health`

> **Free tier note**: Render free tier spins down after 15 minutes of inactivity.  
> The scraper runs every 60 minutes which keeps it alive during the day.  
> For 24/7 uptime, upgrade to Starter ($7/month) or add an external uptime monitor.

---

## Part 2 — Frontend on Vercel

### Step 1: Import Project

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Select your repo
3. Configure:

| Field             | Value        |
|-------------------|--------------|
| **Framework**     | Next.js      |
| **Root Dir**      | `frontend`   |
| **Build Cmd**     | `npm run build` |
| **Output Dir**    | `.next`      |

### Step 2: Set Environment Variables

In Vercel → **Settings** → **Environment Variables**:

| Key                      | Value                                          |
|--------------------------|------------------------------------------------|
| `NEXT_PUBLIC_API_URL`    | `https://your-service.onrender.com`            |
| `NEXT_PUBLIC_SITE_URL`   | `https://your-app.vercel.app`                  |

> Use your actual Render URL from Step 4 above.

### Step 3: Deploy

Click **Deploy**. First build takes 1–2 minutes.

### Step 4: Update CORS on Render

Now that you have your Vercel URL:

1. Go back to Render → **Environment**
2. Set `CORS_ORIGINS` = `https://your-app.vercel.app`
3. Render will auto-redeploy

---

## Part 3 — Verify End-to-End

After both services are deployed:

### 1. Check backend health
```
GET https://your-service.onrender.com/health
```
Expected response:
```json
{
  "status": "ok",
  "db_ok": true,
  "stations_active": 560,
  "total_readings": 4480,
  "last_scrape_at": "2026-07-25 10:00:00"
}
```

### 2. Check cities endpoint
```
GET https://your-service.onrender.com/cities
```
Should return a non-empty array of Indian cities with AQI values.

### 3. Check frontend
Open your Vercel URL. You should see:
- Live stat bar with real station count
- City spotlight grid with real AQI badges
- No "Failed to load" errors in console

### 4. Check live indicator
If the last scrape was < 90 minutes ago, the TopBar shows a green pulsing "Live" dot.

---

## Environment-Specific Notes

### Free tier limitations

| Service | Limitation              | Workaround                              |
|---------|-------------------------|-----------------------------------------|
| Render  | Spins down after 15min  | Scraper keeps it alive; or upgrade plan |
| Render  | 750 hours/month compute | Sufficient for 1 service                |
| Render  | 1 GB disk               | ~6 months of hourly readings            |
| Vercel  | 100 GB bandwidth        | More than sufficient                    |

### Scaling up

When you outgrow free tier:

1. **Render Starter ($7/mo)**: Always-on + more disk
2. **PostgreSQL**: Replace SQLite with Supabase or Railway Postgres — change `database.py` connection and `schema.sql` dialect
3. **Redis**: Replace in-memory rate limiter with Redis for multi-instance deployments
4. **Multiple workers**: Switch from `--workers 1` to `--workers 4` once on Postgres

---

## Continuous Deployment

Both services auto-deploy on push to `main`:
- Render: `autoDeploy: true` in `render.yaml`
- Vercel: enabled by default

### Recommended branch strategy
```
main     → production (auto-deploys)
dev      → preview deployments (Vercel creates preview URLs automatically)
```

---

## Monitoring

### Backend logs (Render)
- **Render Dashboard** → your service → **Logs**
- Filter for `CRITICAL` to catch scrape failure alerts
- Filter for `edit_detection` to see edit events

### Frontend errors (Vercel)
- **Vercel Dashboard** → **Functions** → logs
- Add Sentry for production error tracking: `npm install @sentry/nextjs`

### Uptime monitoring (recommended)
Free options:
- [UptimeRobot](https://uptimerobot.com) — ping `/health` every 5 minutes
- [Better Uptime](https://betteruptime.com) — free plan with alerts

Configure to hit `https://your-service.onrender.com/health` — this also prevents Render free tier spindown.

---

## Troubleshooting

### "Failed to load cities" on frontend
- Check `NEXT_PUBLIC_API_URL` is set correctly in Vercel (no trailing slash)
- Check `CORS_ORIGINS` in Render includes your exact Vercel URL
- Open browser DevTools → Network → look for CORS errors on the `/cities` request

### "0 stations" in health check
- The station list fetch from CPCB may have failed on startup
- Check Render logs for `"Fetching station list"` — look for the error
- CPCB's endpoint is sometimes slow — redeploy to retry

### Database not persisting between deploys
- Ensure the disk mount path matches `DB_PATH` exactly
- Disk must be attached before first deploy that creates the DB

### Render spin-down causing missed scrapes
- Add UptimeRobot to ping `/health` every 5 minutes
- Or upgrade to Starter plan ($7/mo) for always-on

### TypeScript build errors on Vercel
Run locally first:
```bash
cd frontend
npm run type-check
npm run build
```
Fix any type errors before pushing.
