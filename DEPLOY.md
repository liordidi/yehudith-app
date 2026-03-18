# Deployment Guide

Stack: React/Vite → Netlify · Express → Render · Supabase (database + storage)

---

## Deploy order

1. Deploy the backend to Render first (so you have its URL).
2. Deploy the frontend to Netlify, using the Render URL as `VITE_API_URL`.
3. Set `FRONTEND_URL` on Render to the Netlify URL.
4. Verify end-to-end, then generate the QR code.

---

## 1. Backend → Render

### Create a new Web Service on render.com

| Setting | Value |
|---|---|
| Repository root | `backend/` (or set root directory to `backend`) |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `node api/server.js` |
| Instance type | Free (or Starter) |

### Environment variables to set in Render dashboard

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (keep secret) |
| `ADMIN_SECRET` | A strong random string (e.g. `openssl rand -hex 32`) |
| `FRONTEND_URL` | Your Netlify URL, e.g. `https://your-site.netlify.app` |
| `PORT` | Leave unset — Render injects this automatically |

> **Note:** Render sets `PORT` automatically. The backend already reads `process.env.PORT` and binds to `0.0.0.0`, so no changes are needed.

After deploy, your backend URL will be something like:
`https://your-backend.onrender.com`

---

## 2. Frontend → Netlify

### Connect your repo on netlify.com

Netlify will auto-detect `frontend/netlify.toml` if you set the **Base directory** to `frontend/`.

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` *(auto-detected from netlify.toml)* |
| Publish directory | `dist` *(auto-detected from netlify.toml)* |

### Environment variables to set in Netlify dashboard

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://your-backend.onrender.com` |

> **Important:** Netlify bakes env vars at build time for Vite. After setting `VITE_API_URL`, trigger a new deploy (or redeploy) for it to take effect.

---

## 3. Connect frontend URL to backend CORS

After Netlify deploys:

1. Copy your Netlify URL (e.g. `https://your-site.netlify.app`).
2. Go to Render → your backend service → Environment.
3. Set `FRONTEND_URL=https://your-site.netlify.app`.
4. Render will restart the service automatically.

---

## 4. Verify before generating the QR code

- [ ] Open the Netlify URL in a browser — the page loads correctly.
- [ ] The memories section loads (approved memories visible or empty state shown).
- [ ] Submit a test memory (with and without image) — no CORS errors in the browser console.
- [ ] Log into the admin panel (`?admin` in the URL) and approve the test memory.
- [ ] Confirm the approved memory appears on the public page.
- [ ] Check the Render logs for any startup errors.

Once all checks pass, generate the QR code pointing to the Netlify URL.

---

## Local development

```bash
# Backend
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev            # runs on port 4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env.local   # set VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

---

## Supabase requirements

The backend expects:
- A `memories` table with columns: `id`, `name`, `title`, `text`, `image_url`, `status`, `created_at`, `image_crop` (TEXT, optional but recommended).
- A `memory-images` storage bucket set to **public**.

To add the `image_crop` column if missing:
```sql
ALTER TABLE memories ADD COLUMN IF NOT EXISTS image_crop TEXT;
```
