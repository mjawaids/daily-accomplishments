# Project instructions

## Versioning

Versions are calendar-based, `YYYY.MM.DD.N` (UTC date + deploy count for the
day), generated automatically by `deploy.yml` on every deploy. It is shown in
the profile footer (`__APP_VERSION__`, injected by `vite.config.ts`) and
recorded as a `vYYYY.MM.DD.N` git tag and GitHub Release.

**Do not bump or edit the version in PRs.** `package.json`'s `version` is a
`0.0.0` placeholder that CI overwrites in its own working tree. To find what is
live, read the footer, the latest git tag, or the latest GitHub Release.

## UI/UX

Any change under `src/components`, `src/pages` or `src/styles` starts by loading
the `ui-ux` project skill (`.claude/skills/ui-ux/SKILL.md`) and ends with
`npm run ui:check` plus a look at the screenshots it saves in `ui-shots/`. The
check must not report new serious or critical accessibility issues. The
non-negotiables:

- Style the app with the tokens in `src/styles/dailywins.css`, not literal
  colors or fonts. Tailwind is only for the marketing and policy pages in
  `src/pages`.
- WCAG 2.2 AA contrast in light and dark and in every accent. Touch targets of
  at least 44px. A visible `:focus-visible` style. An `aria-label` on every
  icon-only button.
- Every animation has a `prefers-reduced-motion` path. Every data view has
  loading, empty, error and offline states. Layouts work from 360px wide with
  no horizontal scroll.
- New screens, flows and visual redesigns start as a Claude Design mockup on
  the DailyWins design system (https://claude.ai/artifact/XJuytAvtF6nVVD9YRsNENg)
  and are then ported to code. Small tweaks go straight to code.

## Documentation

**Keep the README and all docs up to date with every code change, in the same
PR as the change.** Before finishing any task that touches code, config,
migrations, workflows, environment variables or scripts, check whether
`README.md`, `DEPLOYMENT.md`, `WEBHOOK_SETUP.md`, `.env.example` and this file
still describe reality, and update whatever no longer does. That includes
feature lists, the project structure tree, the environment variable table, the
database schema, npm scripts and setup steps. If a doc is obsolete, fix or
delete it rather than leaving it to mislead. Verify claims against the code
instead of writing from memory, and don't document features that don't exist.
