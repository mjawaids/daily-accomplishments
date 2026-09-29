# Project instructions

## Versioning

Versions are calendar-based, `YYYY.MM.DD.N` (UTC date + deploy count for the
day), generated automatically by `deploy.yml` on every deploy. It is shown in
the profile footer (`__APP_VERSION__`, injected by `vite.config.ts`) and
recorded as a `vYYYY.MM.DD.N` git tag and GitHub Release.

**Do not bump or edit the version in PRs.** `package.json`'s `version` is a
`0.0.0` placeholder that CI overwrites in its own working tree. To find what is
live, read the footer, the latest git tag, or the latest GitHub Release.
