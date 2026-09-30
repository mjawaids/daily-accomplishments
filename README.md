# DailyWins — Record What You Actually Got Done 🌅

A calm, celebratory Progressive Web App for logging your daily wins — part achievement tracker, part journal, part solo stand-up. Built offline-first with real-time sync, a warm hand-crafted design system, and full PWA installability.

## ✨ Features

### 🎯 Core
- **Log your wins** — Capture what you got done in your own words, in categories you control. Every account starts with Work, Personal, Learning and Health, and you can add, rename, recolor, re-icon or delete them (up to 20) from Profile.
- **Timeline** — A day-grouped feed of your wins on a colored timeline rail, with a sticky "Today / Yesterday / weekday" date header and "Load older" paging.
- **Search & filter** — Search your wins by text or category name (accent-insensitive), filter by one or more categories, and jump to a specific date. Press `/` on the Timeline to open it.
- **Quick composer** — An inline composer on the timeline (`Ctrl/⌘ + Enter` to save); a full sheet (with category picker and **back-dating**) for editing or logging a missed win.
- **Streaks & nudges** — A streak counter and a contextual nudge banner that encourages you to keep your run alive.
- **Insights** — Stat cards (streak, this week, total, best day), a last-7-days bar chart, a category-mix breakdown, and a 12-week activity heatmap — computed over your full history.
- **Profile** — Edit your name/email, switch theme, manage push reminders and their time, manage categories, and review per-category counts. The footer shows the running version. A weekly digest is listed as "Soon" and is not implemented yet.

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
- **Update prompt** — When a new version is deployed, a banner offers a Reload button (see [Updates and caching](#7-updates-and-caching)).
- **Push reminders** — Optional daily "log a win" notification at a time you choose, in your own timezone, delivered via OneSignal (see [Push reminders](#5-push-reminders-optional)).

### 🔐 Authentication & Data
- **Email/password + Google** — Supabase Auth with email/password and **Continue with Google** (OAuth). Same-email accounts are linked automatically by Supabase.
- **Google profile** — Uses your Google display name and avatar when signed in with Google.
- **Row Level Security** — Every win is private to its owner, enforced at the database level.
- **Real-time-ready** — Data is keyed to your user and synced through Supabase.

### 📈 Analytics & Billing
- **Google Analytics** (optional) — Page views, auth events, win add/edit/delete, connectivity, and the PWA install funnel.
- **Pro plan via Paddle** (optional) — A `/pricing` page (the Pro plan is still marked "Coming Soon"), a Paddle checkout flow, and a Netlify webhook function that records subscription state in a `profiles` table. See [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md).

## 🏗️ Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Custom CSS design system** (`dailywins.css`) for the app UI; **Tailwind CSS** for marketing/policy pages
- **Supabase** — Auth (email/password + Google OAuth) and PostgreSQL with Row Level Security
- **IndexedDB** + **Service Worker** — offline storage, caching, and background sync
- **react-router-dom** — marketing/policy routes
- **Paddle** + **Netlify Functions** — subscriptions (optional); a scheduled Netlify Function also sends push reminders
- **OneSignal** — web push (optional)
- **vite-plugin-pwa** (Workbox) — service worker generation
- **Vitest** — unit tests
- **Google Analytics 4** — product analytics (optional)

## 🚀 Quick Start

### Prerequisites
- Node.js 22 and npm (pinned in `.nvmrc`)
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
| `VITE_ONESIGNAL_APP_ID` | optional | OneSignal App ID — public by design (push reminders) |
| `PADDLE_WEBHOOK_SECRET` | optional | Server-side Paddle webhook secret (Netlify) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ for functions | Server-side key for Netlify functions |
| `ONESIGNAL_REST_API_KEY` | optional | **Secret.** Server-side OneSignal key (Netlify) |

Node 22 is pinned in `.nvmrc` — `@supabase/supabase-js` declares `engines: node >=22`.

> Server-side secrets (no `VITE_` prefix) must be set in your host's dashboard, never in client code.

### 3. Database
Apply the SQL in `supabase/migrations/` to your project (via the Supabase SQL editor or CLI). This creates the `accomplishments`, `categories`, `profiles`, `user_settings` and `notification_log` tables, plus the RLS policies, triggers and RPC functions around them. In production you never apply these by hand: the deploy workflow does it (see [DEPLOYMENT.md](DEPLOYMENT.md)).

### 4. Enable Google sign-in (optional)
1. Create an OAuth client in Google Cloud Console (Web application) with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase → Authentication → Providers → Google, paste the Client ID/Secret.
3. Add your app origins (e.g. `http://localhost:5173` and production URL) under Authentication → URL Configuration.

### 5. Push reminders (optional)

Daily Wins can send a push notification at each user's chosen local time
(default 8:00 PM) reminding them to log a win. Delivery is handled by OneSignal;
the schedule is owned by `netlify/functions/evening-reminder.ts`, which runs
every 15 minutes and works out who is due in their own timezone.

**In the OneSignal dashboard:**

1. Create an app, then add the **Web** platform and choose the **Custom Code**
   integration type. (The service-worker path is set in `src/lib/onesignal.ts`;
   do *not* also fill in the dashboard's service-worker path fields — setting
   both conflicts.)
2. Fill in Site Details:
   - **Site Name** — `Daily Wins`. This doubles as the default notification title.
   - **Site URL** — your exact production origin, e.g. `https://dailywins.app`.
     It must match the origin the SDK initialises on, `www` included or excluded
     exactly as you serve it. A mismatch makes subscription fail silently.
   - **Default Icon URL** — a square icon on your domain, e.g.
     `https://<site>/icon-512.png`. OneSignal asks for 256×256; supply one at
     that size if it rejects the 512.
   - **Auto Resubscribe** — on.
3. Create a **second app** for local development with Site URL
   `http://localhost:5173`, and enable *"Treat HTTP localhost as HTTPS for
   testing"*. The production app's Site URL check rejects localhost.
4. From **Settings → Keys & IDs**, copy the **App ID** into
   `VITE_ONESIGNAL_APP_ID` and the **REST API Key** into `ONESIGNAL_REST_API_KEY`.

**Keys:** the App ID is public by design and ships in the client bundle. The
REST API Key is a secret — set it only in the Netlify dashboard, never with a
`VITE_` prefix, and never commit it.

**Service worker:** `public/onesignal/OneSignalSDKWorker.js` is served from this
origin alongside the app's own `public/sw.js`. After the first deploy, confirm
it is served as JavaScript rather than swallowed by the SPA redirect:

```bash
curl -I https://<site>/onesignal/OneSignalSDKWorker.js   # expect application/javascript
```

**Platform limits worth knowing:**

- HTTPS with a valid certificate is required (localhost excepted).
- **iOS/iPadOS needs 16.4+ *and* the app added to the Home Screen** — web push
  does not work in an iOS Safari tab. The settings toggle detects this and
  explains it. Android and desktop browsers subscribe directly.
- **Content blockers** (Brave Shields, uBlock Origin and similar) block the
  OneSignal SDK, which loads from `cdn.onesignal.com`. When it fails to load
  (or does not load within 10s), the toggle reports it as blocked and asks the
  user to allow the site and reload. It does not report "not supported".
  Reminders cannot reach that browser until the user does this.
- The reminder payload is deliberately generic and carries no personal data,
  because the Web SDK has no Identity Verification. See the migration header and
  `src/lib/onesignal.ts` for the reasoning.

### 6. Deploying

**Netlify environment variables.** Server-side values must be set in the Netlify dashboard
(Site settings → Environment variables), not in `.env`:

- `SUPABASE_SERVICE_ROLE_KEY` — required by *both* `evening-reminder` and `paddle-webhook`. Neither
  function works without it.
- `ONESIGNAL_REST_API_KEY` — mark as secret, functions scope.
- `VITE_ONESIGNAL_APP_ID` — needs the `builds` scope so it is inlined at build time.

Scheduled functions run **only on published production deploys**, never on deploy previews. After
deploying, check that `evening-reminder` is listed under Functions with its schedule, and that the
OneSignal worker is served as JavaScript rather than swallowed by the SPA redirect:

```bash
curl -I https://<site>/onesignal/OneSignalSDKWorker.js   # expect application/javascript
```

**Supabase.** Apply every file in `supabase/migrations/` — check which have actually been applied
rather than assuming. Nothing else is needed on the Supabase side: the reminder scheduler lives on
Netlify, so there is **no pg_cron, no pg_net and no Edge Functions** to configure.

### 7. Updates and caching

The service worker is generated by `vite-plugin-pwa` (Workbox) — see the `VitePWA` block in
`vite.config.ts`. This matters for correctness, not just offline support:

- Workbox writes a precache manifest with a **content revision per file**, so `dist/sw.js` changes
  whenever any asset changes. The browser detects the update, and the superseded precache (including
  the previous `index.html`) is dropped.
- `public/sw-legacy-cleanup.js` is imported by the generated worker purely to delete the pre-Workbox
  `daily-wins-*` caches left on existing installations. It can be removed once no installs remain on
  a pre-Workbox build.
- `registerType: 'prompt'` means a new worker installs and then *waits*, so nobody loses a half-typed
  win to a surprise reload. `src/components/UpdateBanner.tsx` offers a Reload button; if it is
  ignored, the waiting worker activates by itself once every tab is closed, so the update applies on
  next open.
- `netlify.toml` caches `/assets/*` (content-hashed by Vite) as `immutable` for a year, and forces
  revalidation of `/index.html`. Netlify additionally invalidates its own CDN cache on every deploy.

> Never make the entry document cache-first in a service worker. That is what pinned every returning
> user to the build they first loaded, and it is why the previous hand-rolled `public/sw.js` was
> replaced.

### 8. Run
```bash
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # run ESLint
npm test         # run unit tests (Vitest)
npm run typecheck:functions   # typecheck the Netlify functions
```

## 📁 Project Structure

```
daily-accomplishments/
├── .github/workflows/
│   ├── ci.yml                     # PR checks: lint, tests, typecheck, build, migration dry-run
│   └── deploy.yml                 # main: migrate, deploy to Netlify, tag + release
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw-legacy-cleanup.js       # Deletes pre-Workbox caches (imported by the generated SW)
│   ├── onesignal/                 # OneSignal service worker
│   ├── favicon.svg / .ico         # Brand favicons (all devices)
│   ├── favicon-16x16/32x32.png
│   ├── apple-touch-icon.png       # iOS home-screen icon
│   └── icon-192/512.png           # PWA install icons
├── src/
│   ├── components/
│   │   ├── dw/                    # DailyWins app UI
│   │   │   ├── AppShell.tsx       # Responsive shell (sidebar / tab bar / FAB)
│   │   │   ├── WinsProvider.tsx   # State, Supabase + offline wiring, toast/confetti
│   │   │   ├── useDW.ts           # Hook for the WinsProvider context
│   │   │   ├── components.tsx     # Entry card, composer, form, chips, avatar
│   │   │   ├── screens.tsx        # Timeline (search/filter) + Insights
│   │   │   ├── screens2.tsx       # Profile + Empty
│   │   │   ├── CategorySheet.tsx  # Add / edit / delete categories
│   │   │   ├── PushPrompt.tsx     # One-time push reminder opt-in
│   │   │   ├── Auth.tsx           # Email/password + Google auth
│   │   │   ├── Onboarding.tsx     # 3-step intro (after signup)
│   │   │   ├── icons.tsx          # Icon set + brand mark + category glyphs
│   │   │   ├── keys.ts            # Keyboard-shortcut helpers
│   │   │   └── useDevice.ts       # Responsive + theme hooks
│   │   ├── InstallPrompt.tsx      # PWA install prompt
│   │   ├── UpdateBanner.tsx       # "New version available" reload banner
│   │   ├── OfflineIndicator.tsx
│   │   └── PageHeader / PageFooter / ThemeToggle.tsx  # Marketing/policy pages
│   ├── hooks/useTheme.ts
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client + types
│   │   ├── offline.ts             # IndexedDB offline manager + sync
│   │   ├── winsData.ts            # Date/stat/filter helpers (streak, charts, grouping, search)
│   │   ├── categories.ts          # User categories: colors, icons, CRUD, defaults
│   │   ├── userSettings.ts        # Notification preferences + timezone
│   │   ├── onesignal.ts           # OneSignal web push wrapper
│   │   ├── analytics.ts           # Google Analytics helpers
│   │   └── paddle.ts              # Paddle checkout (optional)
│   ├── pages/                     # Pricing, checkout success, policy routes
│   ├── styles/dailywins.css       # Design tokens + component styles
│   ├── App.tsx                    # Routing + auth/onboarding flow
│   └── main.tsx                   # Entry point
├── supabase/migrations/           # Database schema (applied by the deploy workflow)
├── netlify/functions/
│   ├── evening-reminder.ts        # Scheduled (every 15 min) push reminder sender
│   └── paddle-webhook.ts          # Paddle webhook (optional)
├── scripts/check-build-env.mjs    # Fails the Netlify build if required VITE_* vars are missing
└── vite.config.ts                 # Vite + PWA (Workbox) config; injects __APP_VERSION__
```
(Unit tests sit beside the code as `*.test.ts`.)

## 🗄️ Database Schema

Simplified; the migrations in `supabase/migrations/` are the source of truth.

```sql
-- Your wins
accomplishments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  text text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id),
  category text,              -- legacy text key (work|personal|learning|health), kept in sync by a trigger
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- User-managed categories (four defaults seeded per user; max 20 per user)
categories (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text, color text, icon text, position int,
  legacy_key text             -- maps defaults to the old text values
)

-- Notification preferences (created lazily on first load)
user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  push_alias uuid,            -- opaque OneSignal external ID, never client-writable
  push_enabled boolean,
  evening_reminder_enabled boolean,
  reminder_local_time time,   -- quarter hours only
  timezone text,
  weekly_digest_enabled boolean,
  push_unreachable_since timestamptz
)

-- Reminder send ledger (server-only; RLS with no policies)
notification_log (...)

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
`accomplishments`, `categories`, `user_settings` and `profiles` enforce Row Level Security so users only ever see their own rows. `notification_log` is reachable only through the service role. Reminder scheduling and category deletion go through Postgres functions (`claim_due_evening_reminders`, `delete_category`, and others).

## 🔄 Offline Behavior

- All wins are cached in **IndexedDB**; adds/edits/deletes apply optimistically.
- When offline, operations are queued and replayed on reconnect via **background sync**.
- Insights and the timeline are computed from your full local history, so the app stays useful with no connection.

## 🎨 Customization

- **Theme & tokens** — Edit `src/styles/dailywins.css`. Accent palettes and category colors are defined as CSS custom properties (category accents use OKLCH).
- **Categories** — Users manage their own in the app (Profile → Categories). The available colors and icons, the per-user limit and the default set live in `src/lib/categories.ts`; the color/icon lists must match the CHECK constraints in `supabase/migrations/20260929120000_user_categories.sql`, and the glyphs are in `src/components/dw/icons.tsx`.

## 🚀 Deployment

Production is deployed only by GitHub Actions from `main`: migrations are applied with the Supabase CLI, then the site and functions are deployed to Netlify. Pull requests run lint, tests, a function typecheck, a build and a read-only migration dry-run. Versions are calendar-based (`YYYY.MM.DD.N`), generated on deploy and never edited by hand. Full details, required secrets and rules for schema changes are in [DEPLOYMENT.md](DEPLOYMENT.md).

## 🤝 Contributing

1. Fork and branch: `git checkout -b feature/your-feature`
2. Commit your changes, updating the README and other docs to match (see `CLAUDE.md`)
3. Open a pull request against `main`; CI must pass

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Credits

Developed with ❤️ by [Jawaid](https://jawaid.dev) · Powered by 🚀 [Ibexoft](https://ibexoft.com)
Backend by [Supabase](https://supabase.com) · Hosted on [Netlify](https://netlify.com)

---

*Record what you actually got done — and watch your momentum build.*
