# PitBoard — iRacing Season Planner

Browse every iRacing series, track rotation and schedule. Filter by license, category and owned content.

**Live:** [pitboard.app](https://pitboard.app) · **Stack:** Next.js 14, TypeScript, Tailwind CSS

---

## Features

- 📅 Full season calendar — every series, every week
- 🔍 Filter by category, license, setup type, owned content
- 🗓️ Global calendar view (series × weeks table)
- 📋 My Schedule — personal race calendar with iCal / Google Calendar export
- ⚖️ Series comparator — up to 3 series side by side
- 🏁 Current week highlighted across all views
- 🔗 Shareable series links
- 🌙 Dark / light mode
- 🌍 ES / EN with browser auto-detection
- 📱 PWA — installable on mobile
- 🔐 iRacing OAuth2 (Authorization Code + PKCE)

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/VictorSerradell/simplan.app
cd simplan.app

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in .env.local (see below)

# 4. Run
npm run dev
# → http://localhost:3000
```

The app works without iRacing credentials — it shows demo data. Connect your account for live data.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | App URL (`http://localhost:3000` locally) |
| `IRACING_CLIENT_ID` | OAuth2 client ID from iRacing |
| `IRACING_CLIENT_SECRET` | OAuth2 client secret from iRacing |
| `IRACING_REDIRECT_URI` | Must match registered URI exactly |
| `COOKIE_SECRET` | Random string for session cookies |

### Getting iRacing OAuth credentials

Email `auth@iracing.com` with:
- **Subject:** OAuth2 Client Request — PitBoard
- **Client Name:** PitBoard
- **Client Type:** Server-side (Authorization Code)
- **Redirect URIs:** `https://pitboard.app/api/auth/callback/iracing`
- **Audiences:** `data-server`

Processing takes up to 10 business days.

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "ready for deploy"
git push
```

### 2. Import in Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add environment variables (see table above)
5. Deploy

### 3. Environment variables in Vercel
```
NEXT_PUBLIC_BASE_URL    = https://pitboard.app
IRACING_CLIENT_ID       = your_client_id
IRACING_CLIENT_SECRET   = your_client_secret
IRACING_REDIRECT_URI    = https://pitboard.app/api/auth/callback/iracing
COOKIE_SECRET           = (run: openssl rand -base64 32)
```

### 4. Custom domain
1. Vercel Dashboard → your project → Settings → Domains
2. Add `pitboard.app`
3. Follow DNS instructions from Vercel
4. Update `NEXT_PUBLIC_BASE_URL` to your domain
5. Email iRacing to add production redirect URI

---

## Project Structure

```
app/
├── page.tsx              → Landing (/)
├── app/
│   └── page.tsx          → Planner (/app)
├── api/
│   ├── auth/
│   │   ├── login/        → OAuth2 PKCE init
│   │   ├── callback/     → OAuth2 token exchange
│   │   └── logout/       → Clear session
│   └── iracing/          → iRacing API proxy
├── components/           → UI components
├── lib/                  → Utilities & contexts
└── types/                → TypeScript types
public/
├── manifest.json         → PWA manifest
├── sw.js                 → Service worker
└── *.png                 → Icons & OG image
```

---

## Tech Stack

- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript
- **Styling:** Inline styles + Tailwind CSS utilities
- **Icons:** Lucide React
- **Auth:** OAuth2 Authorization Code + PKCE
- **Deploy:** Vercel

---

## Disclaimer

PitBoard is not affiliated with, endorsed by, or associated with iRacing.com Motorsport Simulations. iRacing is a registered trademark of iRacing.com Motorsport Simulations.
