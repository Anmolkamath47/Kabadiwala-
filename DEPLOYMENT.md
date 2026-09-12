# 🚀 Deployment Guide: Kabadiwala (Render & Vercel)

This repository contains the complete **Kabadiwala Consumer Scrap Pickup Application** consisting of:
- **Backend**: Express + TypeScript + Socket.IO server (`/backend`)
- **Frontend**: Vite + React + Tailwind CSS consumer application (`/frontend`)

---

## 1. Deploy Backend to Render

### Option A: Automatic via Render Blueprint (`render.yaml`)
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Select your GitHub repository: `Anmolkamath47/Kabadiwala-`.
4. Render will detect `render.yaml` automatically and configure the service.

### Option B: Manual Web Service Setup
1. On [Render](https://dashboard.render.com), click **New +** → **Web Service**.
2. Connect your GitHub repository `Anmolkamath47/Kabadiwala-`.
3. Fill in the following settings:
   - **Name**: `kabadiwala-backend`
   - **Region**: Choose closest to your users (e.g., Singapore, Frankfurt, Oregon)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free (or Starter for persistent connections)
4. Under **Advanced** / **Environment Variables**, add:
   | Key | Value / Description |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (or Render's automatic port) |
   | `CLIENT_APP_URL` | Your frontend Vercel URL (e.g., `https://kabadiwala.vercel.app`) |
   | `DEALER_API_URL` | Render URL of the Kabadidealer backend (e.g., `https://kabadidealer-backend.onrender.com/api`) |
   | `DEALER_SERVICE_API_KEY` | Shared secret key matching Kabadidealer backend (e.g. `kbad_shared_internal_secret_key_9988`) |
   | `JWT_SECRET` | Strong random 32+ character string |
   | `JWT_REFRESH_SECRET` | Strong random 32+ character string |
   | `MONGODB_URI` | MongoDB Atlas URI: `mongodb+srv://<user>:<password>@cluster.mongodb.net/kabadiwala` |
   | `USE_MEMORY_DB` | `false` |
   | `OTP_DEMO_CODE` | `1234` |
5. Click **Create Web Service**.
6. Once deployed, note down your backend URL: `https://<service-name>.onrender.com`.

---

## 2. Deploy Frontend to Vercel

1. Log into [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `Anmolkamath47/Kabadiwala-`.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-render-backend-url>.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<your-render-backend-url>.onrender.com` |
6. Click **Deploy**.
7. Once deployment is complete, your Vercel URL (e.g., `https://kabadiwala.vercel.app`) is live!
8. Copy this Vercel URL and update `CLIENT_APP_URL` in your Render Backend environment variables.

---

## 3. Production Verification Checklist

- [ ] `/api/health` on Render backend returns `{"status":"healthy"}`.
- [ ] Vercel frontend loads without CORS errors in browser console.
- [ ] Direct page refresh on any subroute (e.g., `/pickup`, `/orders`, `/profile`, `/rates`) works seamlessly thanks to `vercel.json` rewrites.
- [ ] Real-time Socket.IO connection is established for live dealer tracking and order updates.
