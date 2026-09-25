# Deployment

Production (https://dailywins.ibexoft.com) is deployed **only** by GitHub
Actions from the `main` branch. Nothing else deploys or changes the schema.

| When | Workflow | What it does |
|---|---|---|
| Pull request into `main` | `.github/workflows/ci.yml` | lint, function typecheck, build; `supabase db push --dry-run` against production (read-only) |
| Push to `main` | `.github/workflows/deploy.yml` | `supabase db push`, then `netlify deploy --prod` (builds with Netlify's production env vars) |

Each Netlify deploy's message starts with the commit SHA, so the live
version is always traceable to a commit.

## Rules

- **Change the schema only by adding a file to `supabase/migrations/`**
  (`supabase migration new <name>`), merged through a PR. Never apply SQL
  to production by hand, from the dashboard, or through an AI tool's
  "apply migration" action — those record a different version than the
  file, and the next deploy fails.
- **Migrations must be backward compatible.** They run before the new code
  is deployed, and if the deploy step fails the old code keeps running on
  the new schema. Add first; drop or rename only once no deployed code uses
  the old shape.
- **Never edit or rename a migration that has been applied.** Fix forward
  with a new migration.
- The `migrations` CI check failing means `supabase/migrations/` and
  production's history disagree. Fix the files; do not run
  `supabase migration repair` against production without understanding why.

## Secrets (GitHub > Settings > Secrets and variables > Actions)

| Name | What |
|---|---|
| `SUPABASE_DB_URL` | Supabase Session pooler connection string, password percent-encoded |
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token |
| `NETLIFY_SITE_ID` | Netlify project ID |

App configuration (`VITE_*`, `SUPABASE_SERVICE_ROLE_KEY`,
`ONESIGNAL_REST_API_KEY`, `PADDLE_WEBHOOK_SECRET`) lives in Netlify's
environment variables, not in GitHub. The build fails early if a required
`VITE_*` variable is missing (`scripts/check-build-env.mjs`).

## Manual redeploy

GitHub > Actions > Deploy > Run workflow (branch `main`).
