# Project instructions

## Versioning

The app uses [semantic versioning](https://semver.org). `package.json`
`version` (and the matching two fields in `package-lock.json`) is the single
source of truth. It is shown in the profile footer (`__APP_VERSION__`, injected
by `vite.config.ts`), and each deploy tags `vX.Y.Z` and creates a GitHub
Release. Every change that merges to `main` deploys, so **every change must
bump the version in the same commit/PR** (`ci.yml` fails a PR that doesn't).

Choose the bump from what the change does:

| Bump | When |
|---|---|
| **major** | Breaking or incompatible changes users or data would notice: removed features, destructive or non-backward-compatible schema/data changes, changed account/billing behavior |
| **minor** | New user-visible features or capabilities, backward compatible |
| **patch** | Bug fixes, refactors, performance, dependency updates, copy/style tweaks, docs, CI/tooling |

If a change mixes kinds, use the highest. Apply it with
`npm version <major|minor|patch> --no-git-tag-version` (updates `package.json`
and `package-lock.json` without creating a git tag; the deploy creates the tag).

**If the right bump is unclear** (e.g. is this a new feature or a fix? is this
breaking?), ask the user before committing rather than guessing. Never bump
more than once per PR, and never edit the version to a lower value.
