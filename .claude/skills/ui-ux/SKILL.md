---
name: ui-ux
description: DailyWins UI/UX playbook. Load before changing anything under src/components, src/pages or src/styles, or when designing a new screen, flow or visual change. Covers the design system, the review checklist, the screenshot and accessibility check (npm run ui:check), and when to go through Claude Design first.
---

# DailyWins UI/UX playbook

Good UI here means UI that fits the existing DailyWins system and passes checks
you can run. Don't rely on taste. Follow the rules below, run the check, look
at the screenshots, and fix what you find.

## Sources of truth, in order

1. What the user asked for.
2. The code: tokens and component classes in `src/styles/dailywins.css`
   (scoped under `.dw-app`, themed by `data-theme`, `data-accent`,
   `data-device`), and components in `src/components/dw/` (`components.tsx`,
   `icons.tsx`, `screens.tsx`, `screens2.tsx`).
3. The **DailyWins design system** in Claude Design:
   https://claude.ai/artifact/XJuytAvtF6nVVD9YRsNENg. It is a brand book plus
   tokens (colors in light and dark, type, spacing, radii, shadows) built from
   `dailywins.css`. Read its `project/README.md` with the Artifact tool
   (`action: "read"`, `path: "project/README.md"`) for the voice, color and
   type rules. The artifact is private to the repo owner, so if the read is
   refused, work from this file and the CSS.
4. Public standards, when the three above don't settle a question:
   [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/),
   [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/),
   [Material 3](https://m3.material.io/),
   [web.dev](https://web.dev/) (Core Web Vitals, PWA),
   [Inclusive Components](https://inclusive-components.design/).
   Look things up instead of guessing.

If the code and the design system disagree, the code is what ships. Flag the
drift to the user rather than silently picking one.

## When to use Claude Design first

- **New screen, new flow, or a visual redesign** (Insights charts, onboarding,
  a pricing page, a new sheet): mock it up first in Claude Design, on the
  DailyWins design system, so the user can react to it before code exists. You
  can start one with the Artifact tool (`action: "quickstart"`,
  `intent: "design"`), or the user can do it at claude.ai. Port the approved
  design back by mapping every value to an existing token. Add a new token only
  when nothing fits, and add it to both `dailywins.css` and the design system.
- **Tweaks, fixes, copy, spacing, a new state on an existing component**: go
  straight to code under the rules below.
- If you change a token or add a component, tell the user the design system
  needs the same change (or update it yourself if they ask).

## Workflow

1. Read the relevant part of `dailywins.css` and the component you're touching.
   Reuse existing classes (`dw-btn`, `dw-chip`, `dw-iconbtn`, `dw-card`, sheets,
   `dw-noresults`, `dw-banner`, `dw-status`, `dw-prompt`) and components
   (`Sheet` for any bottom sheet or dialog, `LoadErrorBanner`) and the `Icon`
   wrapper (inline SVG paths in `icons.tsx`) before writing new ones.
2. Implement with tokens only: `var(--ink)`, `var(--surface)`, `var(--accent)`
   and so on. No hex, rgb or font names in `.dw-app` components.
3. Run `npm run ui:check`. Narrow it with `--only=<screens>` (for example
   `--only=timeline,add`) and pick data with `--scenario=<names>` (or `all`).
   It saves screenshots to `ui-shots/` and runs an axe-core WCAG 2.2 AA scan.
   Signed-out screens are named `<screen>-<mobile|desktop>-<light|dark>.png`,
   signed-in ones `<screen>-<scenario>-<mobile|desktop>-<light|dark>.png`.
   Screens whose content scrolls also get a `-full.png` with the whole scroll
   area laid out, so check below the fold too. `--accent=<names>` (or `all`)
   renders the other brand accents, adding `-<accent>` to file names.
4. **Open the screenshots for the screens you changed** with Read, in both
   widths and both themes, and review them against the checklist below.
5. Fix, re-run, and repeat until the screenshots look right and axe reports no
   new serious or critical issues.
6. Tell the user what you checked and anything you couldn't check.

### About the check

- Screens: `signin`, `signup`, `pricing`, `privacy`, `terms`, `refund`,
  `getapp` (sign-in with its install button showing) (signed out), and
  `timeline`, `insights`, `profile`, `add` (the add-win sheet), `search`
  (search and filters open, one category picked), `category` (the category
  editor sheet), `push` (the evening-reminder prompt), `install` (the install
  prompt, plus the Install app sidebar item and mobile header button),
  `install-steps` (the Add to Home Screen steps, as an iPhone sees them from
  Profile), `update` (the new-version banner),
  `tour` and `log` (logs a win from the composer and shows the result; in the
  `error` and `offline` scenarios that is a save that didn't reach the server)
  (signed in). A screen whose state doesn't exist in a scenario (no wins to
  search in `empty`) is skipped and listed at the end.
- Signed-in screens run against a fake Supabase inside the browser
  (`scripts/ui-check/fake-supabase.mjs`). No account or secret is needed, and
  the check never contacts a real project: it forces a fake Supabase URL and
  blocks every host except the dev server, the fake and Google Fonts.
- The data comes from scenarios in `scripts/ui-check/scenarios.mjs`:
  `default` (a 5-day streak, about 10 weeks of history), `empty` (new
  account), `busy` (20 categories, 60-day streak, very long text), `error`
  (every database call fails) and `offline` (goes offline after loading). When
  a change needs a state no scenario covers, add one there. Fixture shapes are
  typed against `src/lib/supabase.ts` and checked by
  `npm run typecheck:ui-check`, which CI runs.
- The fixtures are fake, so the check proves how the UI looks, not that the
  backend works. Unit tests and the CI migration dry-run cover the backend. If
  the check reports a call the fake can't answer, extend
  `fake-supabase.mjs` rather than working around it.
- A full run of one scenario takes about 3–4 minutes; use `--only` while
  iterating.
- The sandbox may not reach Google Fonts, so screenshots can show Georgia or
  system-ui instead of Bricolage and Hanken. Judge layout, color and spacing
  from them, not the typefaces.
- The check reported no serious or critical issues after the September 2026
  UI/UX audit. Treat any it reports now as caused by your change. Still open
  from that audit, deliberately: the Pricing, policy and checkout pages use a
  separate Tailwind look (blue/purple, Title Case, emoji) that drifts from
  the brand, and the auth brand panel puts white text on the accent to
  accent-2 gradient. Both wait on a Claude Design pass.

## Checklist

**Layout and responsiveness**
- Works from 360px to 1440px wide with no horizontal scroll. Check both
  `data-device` layouts: mobile has the bottom tab bar and composer, desktop has
  the 236px sidebar with a 760px canvas (980px for wide screens).
- Respect safe-area insets (`env(safe-area-inset-*)`) for anything fixed to the
  top or bottom. It's an installable PWA.
- Lay out with flex/grid and `gap`. Text containers get `min-width: 0` so long
  wins wrap instead of overflowing.

**Typography**
- Display face (`--font-display`) only for titles, day headers, the wordmark
  and big numerals. Body face for everything else.
- Stick to the sizes already in use (26, 16, 14.5, 13, 12.5, 12px). Nothing
  below 12px. Inputs you type into are 16px so iOS doesn't zoom.
- Running text stays under about 70 characters per line.

**Color and contrast**
- Text at least 4.5:1 (3:1 for 24px+ or 19px+ bold) and icons, borders and
  focus rings at least 3:1, in **both themes and all four accents**
  (sunrise, forest, indigo, berry).
- `--muted` is the lightest color allowed for text. `--faint` is for
  placeholders and borders only.
- Accent as text (active tabs, numbers, links) uses `--accent-text`, never raw
  `--accent`. Filled accent surfaces with white text use `--accent-strong`.
  Category fills behind white text use `--cat-<color>-strong` (set by
  `catColorVar`). Danger text uses `--danger`, danger fills `--danger-fill`.
- Don't dim a whole row with `opacity` to show it's unavailable: dim the
  control and say why in the row's text.
- Category colors mean "which category", never status. Status carries an icon
  or word too, never color alone.

**States**. Every data view has:
- loading (a skeleton or a quiet spinner, no layout jump),
- empty (says what will appear and offers the next action, like "Your wins
  start here"),
- error (plain language, what happened and how to fix it, a retry),
- offline (the app is offline-first: `OfflineIndicator` shows offline status
  and the pending-sync count; see `src/lib/offline.ts`),
- writes the server didn't take: the app queues them on the device, so say
  that ("Saved on this device and will sync later") instead of confirming
  success, and show an error if even the device queue fails.
- Feedback reaches screen readers: toasts go through `Toast` (a live region);
  errors use `role="alert"`.

**Interaction and accessibility**
- Touch targets at least 44×44px (pad around smaller visuals).
- Every control is reachable and usable by keyboard with a visible
  `:focus-visible` style (the shared ring in `dailywins.css`; don't set
  `outline:none` without drawing a replacement). Esc closes sheets and dialogs,
  and focus returns to the control that opened them: use `Sheet`, which does
  this and traps Tab. A sheet opened from inside a screen still covers the
  whole app (it portals into `.dw-app`).
- Inputs have a real `<label>` (or `aria-label`), and sign-in fields have
  `autocomplete`. Toggles are `role="switch"` with `aria-checked`; selectable
  chips and segments have `aria-pressed`.
- A long grid of similar buttons (the heatmap) is one Tab stop with arrow-key
  movement, not dozens of stops.
- Icon-only buttons need an `aria-label` (a `title` alone isn't enough).
- Hover-only affordances need a touch or focus equivalent. The existing
  `(hover:none)` / `(pointer:coarse)` rules hide hover UI on touch.
- Use real `<button>`, `<a>`, `<label>` and headings in order. No clickable
  divs, except as a mouse shortcut next to a real, named button that does the
  same thing (win cards and their Edit button). Screens have `<main>` and
  `<nav>` landmarks and `h2` section headings under the `h1`.

**Motion**
- UI transitions 0.15–0.2s. Confetti on a new win is the signature moment.
  Don't add competing flourishes.
- Every animation or transition you add also goes under
  `@media (prefers-reduced-motion: reduce)`, following the pattern already in
  `dailywins.css` (its reduced-motion block turns off transitions, sheet and
  toast animations and confetti).

**Copy**
- Sentence case, "you/your", short and concrete, warm without hype, no emoji.
  One deliberate exception: the credit line on Timeline and Profile reads
  "Developed with ❤️ by Jawaid · Powered 🚀 by Ibexoft". Keep it, with the
  decorative parts in `aria-hidden` spans so screen readers hear "Developed by
  Jawaid · Powered by Ibexoft". Buttons say what happens ("Log a win", "Save"). Destructive actions state the
  consequence ("This can't be undone.") and ask before deleting more than one
  thing. The app never says "we" or "I".

**Performance**
- Don't add a UI library for something a few lines of CSS can do. Keep images
  sized and lazy. Keep interactions responsive (INP under 200ms). Avoid layout
  shift when data arrives.
