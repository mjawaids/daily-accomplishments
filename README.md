# DailyWins — Record What You Actually Got Done 🌅

A calm, celebratory Progressive Web App for logging your daily wins — part achievement tracker, part journal, part solo stand-up. Built offline-first with real-time sync, a warm hand-crafted design system, and full PWA installability.

## ✨ Features

### 🎯 Core
- **Log your wins** — Capture what you got done in your own words, across four categories: Work, Personal, Learning, and Health.
- **Timeline** — A day-grouped feed of your wins on a colored timeline rail, with a sticky "Today / Yesterday / weekday" date header and "Load older" paging.
- **Quick composer** — An inline composer on the timeline; a full sheet (with category picker and **back-dating**) for editing or logging a missed win.
- **Streaks & nudges** — A streak counter and a contextual nudge banner that encourages you to keep your run alive.
- **Insights** — Stat cards (streak, this week, total, best day), a last-7-days bar chart, a category-mix breakdown, and a 12-week activity heatmap — computed over your full history.
- **Profile** — Edit your name/email, switch theme, toggle notification preferences, and review per-category counts.

### 🎨 Design & UX
- **Warm, custom design system** — Hand-built design tokens (`src/styles/dailywins.css`) scoped under `.dw-app`, themed via data attributes. Brand mark is a rising sun + checkmark in a sunrise gradient.
- **Light / Dark / Auto** — Theme preference with an `Auto` mode that follows your device.
- **Responsive shell** — A sidebar layout on desktop and a bottom tab bar + composer on mobile, driven from a single responsive component.
- **Typography** — Bricolage Grotesque (display) + Hanken Grotesque (body).
- **Delight** — Confetti on a new win, toasts, and subtle entrance animations (respecting `prefers-reduced-motion`).

### 📱 Progressive Web App
- **Installable** — Full web manifest + multi-resolution favicons/icons; installs as a native-like app on mobile and desktop.
- **Offline-first** — Works fully offline using IndexedDB; changes apply optimistically.
- **Background sync** — Pending offline changes sync automatically when you reconnect.

### 🔐 Authentication & Data
- **Email/password + Google** — Supabase Auth with email/password and **Continue with Google** (OAuth). Same-email accounts are linked automatically by Supabase.
- **Google profile** — Uses your Google display name and avatar when signed in with Google.
- **Row Level Security** — Every win is private to its owner, enforced at the database level.
- **Real-time-ready** — Data is keyed to your user and synced through Supabase.

### 📈 Analytics & Billing
- **Google Analytics** (optional) — Page views, auth events, win add/edit/delete, connectivity, and the PWA install funnel.
- **Pro plan via Paddle** (optional) — A pricing page and Paddle checkout flow, with subscription state stored in a `profiles` table and a Netlify webhook function.

## 🏗️ Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Custom CSS design system** (`dailywins.css`) for the app UI; **Tailwind CSS** for marketing/policy pages
- **Supabase** — Auth (email/password + Google OAuth) and PostgreSQL with Row Level Security
- **IndexedDB** + **Service Worker** — offline storage, caching, and background sync
- **react-router-dom** — marketing/policy routes
- **Paddle** + **Netlify Functions** — subscriptions (optional)
- **Google Analytics 4** — product analytics (optional)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) project

### 1. Install
```bash
git clone https://github.com/mjawaids/daily-accomplishments.git
cd daily-accomplishments
npm install
```

### 2. Configure environment
Copy the example env and fill in your values:
```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_GA_TRACKING_ID` | optional | Google Analytics 4 measurement ID |
| `VITE_PADDLE_CLIENT_TOKEN` | optional | Paddle.js client token (Pro plan) |
| `VITE_PADDLE_PRICE_ID` | optional | Paddle price ID for the Pro plan |
| `VITE_PADDLE_SANDBOX` | optional | `true` to use Paddle sandbox |
| `PADDLE_WEBHOOK_SECRET` | optional | Server-side Paddle webhook secret (Netlify) |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-side key for Netlify functions |

> Server-side secrets (no `VITE_` prefix) must be set in your host's dashboard, never in client code.

### 3. Database
Apply the SQL in `supabase/migrations/` to your project (via the Supabase SQL editor or CLI). This creates the `accomplishments` and `profiles` tables with RLS policies and triggers.

### 4. Enable Google sign-in (optional)
1. Create an OAuth client in Google Cloud Console (Web application) with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase → Authentication → Providers → Google, paste the Client ID/Secret.
3. Add your app origins (e.g. `http://localhost:5173` and production URL) under Authentication → URL Configuration.

### 5. Run
```bash
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # run ESLint
```

## 📁 Project Structure

```
daily-accomplishments/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (cache + background sync)
│   ├── favicon.svg / .ico         # Brand favicons (all devices)
│   ├── favicon-16x16/32x32.png
│   ├── apple-touch-icon.png       # iOS home-screen icon
│   └── icon-192/512.png           # PWA install icons
├── src/
│   ├── components/
│   │   ├── dw/                    # DailyWins app UI
│   │   │   ├── AppShell.tsx       # Responsive shell (sidebar / tab bar / FAB)
│   │   │   ├── WinsProvider.tsx   # State, Supabase + offline wiring, toast/confetti
│   │   │   ├── components.tsx     # Entry card, composer, form, chips, avatar
│   │   │   ├── screens.tsx        # Timeline + Insights
│   │   │   ├── screens2.tsx       # Profile + Empty
│   │   │   ├── Auth.tsx           # Email/password + Google auth
│   │   │   ├── Onboarding.tsx     # 3-step intro (after signup)
│   │   │   ├── icons.tsx          # Icon set + brand mark + category glyphs
│   │   │   └── useDevice.ts       # Responsive + theme hooks
│   │   ├── InstallPrompt.tsx      # PWA install prompt
│   │   └── OfflineIndicator.tsx
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client + types
│   │   ├── offline.ts             # IndexedDB offline manager + sync
│   │   ├── winsData.ts            # Date/stat helpers (streak, charts, grouping)
│   │   ├── analytics.ts           # Google Analytics helpers
│   │   └── paddle.ts              # Paddle checkout (optional)
│   ├── pages/                     # Pricing + policy routes
│   ├── styles/dailywins.css       # Design tokens + component styles
│   ├── App.tsx                    # Routing + auth/onboarding flow
│   └── main.tsx                   # Entry point
├── supabase/migrations/           # Database schema
└── netlify/functions/             # Paddle webhook (optional)
```

## 🗄️ Database Schema

```sql
-- Your wins
accomplishments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  text text NOT NULL,
  category text CHECK (category IN ('work','personal','learning','health')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Subscription state (auto-created on signup)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  subscription_status text,   -- free | active | cancelled | past_due
  subscription_plan text,     -- free | pro
  paddle_customer_id text,
  paddle_transaction_id text,
  ...
)
```
Both tables enforce Row Level Security so users only ever see their own rows.

## 🔄 Offline Behavior

- All wins are cached in **IndexedDB**; adds/edits/deletes apply optimistically.
- When offline, operations are queued and replayed on reconnect via **background sync**.
- Insights and the timeline are computed from your full local history, so the app stays useful with no connection.

## 🎨 Customization

- **Theme & tokens** — Edit `src/styles/dailywins.css`. Accent palettes and category colors are defined as CSS custom properties (category accents use OKLCH).
- **Categories** — Defined in `src/lib/winsData.ts` (`CATS`) with matching glyphs in `src/components/dw/icons.tsx`; the database `category` check constraint must be updated to add new ones.

## 🚀 Deployment

Deploys cleanly to **Netlify** (`netlify.toml` builds `dist/` and serves the SPA). Set the environment variables in your host's dashboard, including any optional GA/Paddle keys and server-side secrets.

```bash
npm run build   # outputs dist/
```

## 🤝 Contributing

1. Fork and branch: `git checkout -b feature/your-feature`
2. Commit your changes
3. Open a pull request

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Credits

Developed with ❤️ by [Jawaid](https://jawaid.dev) · Powered by 🚀 [Ibexoft](https://ibexoft.com)
Backend by [Supabase](https://supabase.com) · Hosted on [Netlify](https://netlify.com)

---

*Record what you actually got done — and watch your momentum build.*
