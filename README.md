# AQI Memory — Deployment Guide

**100% browser-based deployment. No terminal. No local install. $0/month.**

You need accounts at three free services:
- [github.com](https://github.com) — you already have this
- [turso.tech](https://turso.tech) — database
- [render.com](https://render.com) — backend
- [vercel.com](https://vercel.com) — frontend
- [uptimerobot.com](https://uptimerobot.com) — keeps backend awake (free)

Total time: ~20 minutes.

---

## Overview

```
Your Browser
     │
     ▼
Vercel  (Next.js frontend)   ← free, global CDN
     │ API calls
     ▼
Render  (FastAPI backend)    ← free, Singapore region
     │ SQL over WebSocket
     ▼
Turso   (SQLite database)    ← free, 500 MB
     │ scrapes every hour
     ▼
CPCB API  (govt data)        ← free, no key needed
```

---

## Step 1 — Upload code to GitHub

You will upload the extracted zip contents directly through the GitHub website.

**1.1 — Go to your repository**

Open: `https://github.com/sugumaran-nix/aqi-memory`

**1.2 — Delete old files (if repo already has content)**

If the repo has existing files you want to replace:
1. Click each folder → click the **pencil icon** → scroll down → **Delete file** — OR —
2. Easier: go to **Settings** → scroll to **Danger Zone** → **Delete this repository** → create a fresh one with the same name `aqi-memory`

**1.3 — Upload the backend folder**

1. Extract the zip file on your computer — you will get a folder called `aqi-memory-premium`
2. On GitHub, click **Add file** → **Upload files**
3. Open the `aqi-memory-premium` folder on your computer
4. Drag the entire **`backend`** folder into the GitHub upload area
5. Scroll down → Commit message: `add backend`
6. Select **Commit directly to main**
7. Click **Commit changes**

**1.4 — Upload the frontend folder**

1. Click **Add file** → **Upload files** again
2. Drag the entire **`frontend`** folder into the upload area
3. Commit message: `add frontend`
4. Click **Commit changes**

**1.5 — Upload root files**

1. Click **Add file** → **Upload files** again
2. From the `aqi-memory-premium` folder, drag these files individually:
   - `render.yaml`
   - `README.md`
3. Also drag the `.github` folder (if your OS shows hidden folders — press `Cmd+Shift+.` on Mac or check **View → Hidden items** on Windows)
4. Commit message: `add config files`
5. Click **Commit changes**

**Verify:** Your repo should now show folders: `backend/`, `frontend/`, `.github/`, and files `render.yaml`, `README.md`

---

## Step 2 — Create the Turso database

Turso is a hosted SQLite database. Free tier: 500 MB storage, 9 GB bandwidth/month.

**2.1 — Create account**

1. Go to [app.turso.tech](https://app.turso.tech)
2. Click **Sign up** → **Continue with GitHub**
3. Authorize Turso on GitHub

**2.2 — Create the database**

1. Click **+ New database**
2. Name: `aqi-memory`
3. Region: **Singapore (sin)** — closest to India's CPCB servers
4. Click **Create database**
5. Wait for it to show **Ready** (10–20 seconds)

**2.3 — Get the connection URL**

1. Click on your `aqi-memory` database
2. Click **Connect** (top right)
3. Under **Connection string**, copy the URL that starts with `libsql://`
   - Looks like: `libsql://aqi-memory-sugumaran-nix.turso.io`
4. **Save this** — you need it in Step 3

**2.4 — Create an auth token**

1. Still on the database page, click **Generate Token**
2. Expiry: **No expiration**
3. Click **Generate**
4. Copy the long token that appears (starts with `eyJ...`)
5. **Save this** — you need it in Step 3

> ⚠️ The token is only shown once. If you miss it, generate a new one.

---

## Step 3 — Deploy backend on Render

Render runs the FastAPI backend + hourly CPCB scraper. Free tier: 750 hours/month.

**3.1 — Create account**

1. Go to [render.com](https://render.com)
2. Click **Get Started** → **Sign in with GitHub**
3. Authorize Render on GitHub

**3.2 — Create a new Web Service**

1. Click **New +** → **Web Service**
2. Click **Connect a repository**
3. Find `sugumaran-nix/aqi-memory` → click **Connect**

**3.3 — Fill in settings**

Fill in these exact values on the next screen:

| Field | Value |
|---|---|
| Name | `aqi-memory-backend` |
| Region | **Singapore** |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | **Python 3** |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --loop uvloop` |
| Instance Type | **Free** |

> ⚠️ **Root Directory must be `backend`** — not blank, not `.`, not the repo root

**3.4 — Add environment variables**

Scroll down to the **Environment Variables** section. Click **Add Environment Variable** for each row:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.4` |
| `TURSO_URL` | `libsql://aqi-memory-sugumaran-nix.turso.io` ← your URL from Step 2.3 |
| `TURSO_TOKEN` | `eyJ...` ← your token from Step 2.4 |
| `LOG_LEVEL` | `INFO` |
| `TRUST_PROXY` | `1` |
| `CORS_ORIGINS` | *(leave completely blank for now — you'll fill this after Step 4)* |

> ⚠️ **Do NOT add a Disk** — there is no disk section in this setup. The database is Turso.

**3.5 — Deploy**

1. Click **Create Web Service**
2. Render opens the **Logs** tab automatically
3. Watch the logs — first deploy takes **5–10 minutes**

You will see this sequence in the logs:
```
==> Build successful 🎉
==> Starting service...
=== AQI Memory starting up ===
Database initialized (Turso remote)
Loaded 563 stations
Running initial scrape…
Initial scrape complete
Scheduler started
INFO:     Application startup complete.
```

If you see `Database initialized (Turso remote)` — Turso connection is working ✅

**3.6 — Get your backend URL**

Once deployed, Render shows your URL at the top of the page:
```
https://aqi-memory-backend.onrender.com
```

**3.7 — Test the backend**

Open this URL in your browser (replace with your actual Render URL):
```
https://aqi-memory-backend.onrender.com/health
```

You should see:
```json
{
  "status": "ok",
  "db_ok": true,
  "stations_active": 563,
  "total_readings": 4500,
  "last_scrape_at": "2026-07-31 05:00:00",
  "last_scrape_duration_seconds": 87
}
```

**If `db_ok` is `false`:**
- Render Dashboard → your service → **Environment** tab
- Check `TURSO_URL` starts with `libsql://` (not `https://`)
- Check `TURSO_TOKEN` is the full token (very long, not cut off)
- Fix the value → **Save Changes** → Render redeploys automatically

**If `stations_active` is 0:**
- CPCB was temporarily unreachable during startup
- Click **Manual Deploy** → **Deploy latest commit** to retry

---

## Step 4 — Deploy frontend on Vercel

Vercel hosts the Next.js frontend. Free tier: 100 GB bandwidth/month, unlimited deploys.

**4.1 — Create account**

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel on GitHub

**4.2 — Import your repository**

1. Click **Add New…** → **Project**
2. Find `sugumaran-nix/aqi-memory` in the list
3. Click **Import**

**4.3 — Configure the project**

On the configuration screen:

| Field | Value |
|---|---|
| Framework Preset | **Next.js** *(auto-detected — verify it says Next.js)* |
| Root Directory | Click **Edit** → type `frontend` → click **Continue** |
| Build Command | `npm run build` *(leave as default)* |
| Output Directory | `.next` *(leave as default)* |
| Install Command | `npm install` *(leave as default)* |

> ⚠️ **Root Directory must be `frontend`** — this is the most common mistake

**4.4 — Add environment variable**

Still on the same configuration screen, scroll to **Environment Variables**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://aqi-memory-backend.onrender.com` |

Use your exact Render URL from Step 3.6. No trailing slash.

**4.5 — Deploy**

1. Click **Deploy**
2. Vercel builds and deploys — takes **2–4 minutes**
3. When done, you see a preview with your URL:

```
https://aqi-memory.vercel.app
```
or
```
https://aqi-memory-<hash>-sugumaran-nix.vercel.app
```

Copy this URL — you need it in Step 5.

**4.6 — Test the frontend**

Open your Vercel URL in the browser. You should see:
- The homepage with the animated hero section
- Stat cards counting up (stations: 563, readings: some number)
- City spotlight cards with real AQI values and sparklines

If everything loads — go to Step 5.

---

## Step 5 — Cross-link CORS

Without this step, the frontend cannot talk to the backend (CORS error).

**5.1 — Add CORS to Render**

1. Render Dashboard → click `aqi-memory-backend`
2. Click **Environment** tab
3. Find the `CORS_ORIGINS` row → click the pencil icon to edit
4. Set the value to your Vercel URL: `https://aqi-memory.vercel.app`
   - No trailing slash
   - Exact URL including `https://`
5. Click **Save Changes**
6. Render auto-redeploys (~2 minutes) — wait for the green **Live** badge

**5.2 — Verify no CORS errors**

1. Open your Vercel site
2. Press **F12** → **Console** tab
3. Reload the page
4. You should NOT see any red `CORS` or `Access-Control-Allow-Origin` errors
5. The page should load real data (not spinning skeletons)

---

## Step 6 — Prevent Render spin-down

Render free tier **sleeps after 15 minutes of no traffic**. A sleeping backend misses its hourly scrape schedule. Fix this for free with UptimeRobot.

**6.1 — Create UptimeRobot account**

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Click **Register for FREE**
3. Fill in name, email, password → verify your email

**6.2 — Add a monitor**

1. Click **+ Add New Monitor**
2. Fill in:

| Field | Value |
|---|---|
| Monitor Type | **HTTP(S)** |
| Friendly Name | `AQI Memory Backend` |
| URL | `https://aqi-memory-backend.onrender.com/health` |
| Monitoring Interval | **5 minutes** |

3. Click **Create Monitor**

UptimeRobot now pings your backend every 5 minutes — Render never sleeps.

**6.3 — Add email alert (optional but recommended)**

1. Click **Alert Contacts** in the left sidebar
2. Click **+ Add Alert Contact**
3. Type: **E-mail**, enter your email
4. Click **Create Alert Contact**
5. Go back to your monitor → click **Edit** → add the alert contact

You'll get an email if the backend goes down.

---

## Step 7 — Final verification

Open your Vercel URL and check every page:

**Homepage (`/`)**
- [ ] Hero section loads with animated gradient text
- [ ] Stat cards show real numbers: ~563 stations, growing readings count
- [ ] City marquee scrolls across the top
- [ ] City spotlight cards show AQI badges with colours
- [ ] "Latest edits caught" section loads (may be empty on day 1 — normal)

**Cities page (`/cities`)**
- [ ] Full list of Indian cities loads
- [ ] Search box filters correctly
- [ ] Sort by AQI works

**City detail page (click any city)**
- [ ] AQI badge shows current value with colour
- [ ] AQI gauge (progress bar 0–500) appears
- [ ] Chart renders with pollutant data
- [ ] No "city not found" error

**Edit tracker (`/edits`)**
- [ ] Page loads without error
- [ ] Stats row shows numbers (may be 0 for first hour — edits appear after 2nd scrape cycle)

**About (`/about`)**
- [ ] Page renders with tech stack grid and GitHub link

**DevTools check (important):**
1. Press **F12** → **Network** tab
2. Reload the page
3. Filter network requests by your Render URL
4. Every request should show status **200**
5. Zero red errors in the **Console** tab

---

## After deployment

**Auto-deploy on code changes:**
Both Render and Vercel automatically redeploy when you push to `main` on GitHub. To update:
1. Make changes to files in GitHub (click the file → pencil icon to edit)
2. Commit to `main`
3. Render and Vercel both redeploy automatically within ~3 minutes

**Edits log fills up after 2 scrape cycles:**
The edit detector compares two consecutive scrape runs. After ~2 hours from first startup, the `/edits` page will start showing any detected mutations.

---

## Troubleshooting

### Spinning skeletons / "Failed to load" on frontend

**Cause:** Frontend can't reach the backend.

1. Open DevTools → Network tab — what status code is returned?
2. **CORS error in Console** → `CORS_ORIGINS` on Render doesn't match your exact Vercel URL (Step 5)
3. **Connection refused / network error** → Render is sleeping. Open `https://aqi-memory-backend.onrender.com/health` in a new tab to wake it, then reload
4. **404 on API calls** → `NEXT_PUBLIC_API_URL` on Vercel is wrong. Go to Vercel → Settings → Environment Variables → fix → redeploy

### `db_ok: false` in health check

1. Render Dashboard → your service → Logs tab → search for `libsql` or `Turso`
2. Check `TURSO_URL` on Render: must start with `libsql://` exactly
3. Check `TURSO_TOKEN`: must be the full JWT (very long string, not truncated)
4. Go to [app.turso.tech](https://app.turso.tech) → verify `aqi-memory` database exists and shows **Ready**

### Build failed on Render

1. Render Logs → look for the red error line
2. Most common: **Root Directory not set to `backend`** → Settings → Build & Deploy → fix Root Directory → Manual Deploy

### Build failed on Vercel

1. Vercel → your project → Deployments → click the failed deploy → View Build Logs
2. Most common: **Root Directory not set to `frontend`** → Project Settings → General → Root Directory → fix → Redeploy

### `stations_active: 0` in health check

CPCB API was unreachable at startup. Fix: Render → Manual Deploy → Deploy latest commit. The startup sequence retries the station load.

### Edit tracker empty after 24 hours

1. Render Logs → search `Edit detection` — should see `Edit detection logged N changes`
2. If CPCB hasn't changed any data yet, the log stays empty — this is correct behaviour
3. Check `https://aqi-memory-backend.onrender.com/edits/stats` — if `total_edits_all_time` is 0 after 24h, check UptimeRobot is keeping the backend alive

---

## Free tier summary

| Service | Free limit | This app uses |
|---|---|---|
| GitHub | Unlimited public repos | 1 repo |
| Turso | 500 MB · 9 GB bandwidth | ~280 MB (90-day rolling) · ~2 GB/month |
| Render | 750 hours/month | ~744 hours (1 service) |
| Vercel | 100 GB bandwidth | ~1–2 GB/month |
| UptimeRobot | 50 monitors · 5 min checks | 1 monitor |

**Everything stays free indefinitely** as long as you have only one Render service and the 90-day data cleanup job runs (it does automatically every Sunday at 03:00 IST).

---

*Built by [sugumaran-nix](https://github.com/sugumaran-nix) · MIT License*
