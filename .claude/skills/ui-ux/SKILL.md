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
   `dw-noresults`) and the `Icon` wrapper (lucide-react) before writing new ones.
2. Implement with tokens only: `var(--ink)`, `var(--surface)`, `var(--accent)`
   and so on. No hex, rgb or font names in `.dw-app` components.
3. Run `npm run ui:check`. Narrow it with `--only=<screens>` (for example
   `--only=timeline,add`) and pick data with `--scenario=<names>` (or `all`).
   It saves screenshots to `ui-shots/` and runs an axe-core WCAG 2.2 AA scan.
   Signed-out screens are named `<screen>-<mobile|desktop>-<light|dark>.png`,
   signed-in ones `<screen>-<scenario>-<mobile|desktop>-<light|dark>.png`.
4. **Open the screenshots for the screens you changed** with Read, in both
   widths and both themes, and review them against the checklist below.
5. Fix, re-run, and repeat until the screenshots look right and axe reports no
   new serious or critical issues.
6. Tell the user what you checked and anything you couldn't check.

### About the check

- Screens: `signin`, `signup`, `pricing`, `privacy`, `terms`, `refund`
  (signed out), and `timeline`, `insights`, `profile`, `add` (the add-win
  sheet) and `tour` (signed in).
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
- Known issues as of this skill's creation, which the check will report until
  they're fixed: icon-only buttons and a few inputs without accessible names
  (auth, profile, add sheet); white text on the Sunrise accent and on the
  avatar initials failing contrast; small tour dots (`target-size`); and
  low-contrast body text on the Tailwind policy pages in dark mode. Beyond
  axe: in the `error` scenario the timeline shows the new-account empty state
  instead of an error, and `OfflineIndicator` is not mounted, so the app shows
  nothing when offline. Don't add to this list. If your change touches one of
  these, fix it.

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
- Category colors mean "which category", never status. Status carries an icon
  or word too, never color alone.

**States**. Every data view has:
- loading (a skeleton or a quiet spinner, no layout jump),
- empty (says what will appear and offers the next action, like "Your wins
  start here"),
- error (plain language, what happened and how to fix it, a retry),
- offline (the app is offline-first; say what's pending sync, see
  `src/lib/offline.ts`; `src/components/OfflineIndicator.tsx` exists but is not
  mounted yet),
- optimistic updates that roll back visibly if the server rejects them.

**Interaction and accessibility**
- Touch targets at least 44×44px (pad around smaller visuals).
- Every control is reachable and usable by keyboard with a visible
  `:focus-visible` style. Esc closes sheets and dialogs, and focus returns to the
  control that opened them.
- Icon-only buttons need an `aria-label` (a `title` alone isn't enough).
- Hover-only affordances need a touch or focus equivalent. The existing
  `(hover:none)` / `(pointer:coarse)` rules hide hover UI on touch.
- Use real `<button>`, `<a>`, `<label>` and headings in order. No clickable divs.

**Motion**
- UI transitions 0.15–0.2s. Confetti on a new win is the signature moment.
  Don't add competing flourishes.
- Every animation or transition you add also goes under
  `@media (prefers-reduced-motion: reduce)`, following the pattern already in
  `dailywins.css`.

**Copy**
- Sentence case, "you/your", short and concrete, warm without hype, no emoji.
  Buttons say what happens ("Log a win", "Save"). Destructive actions state the
  consequence ("This can't be undone.").

**Performance**
- Don't add a UI library for something a few lines of CSS can do. Keep images
  sized and lazy. Keep interactions responsive (INP under 200ms). Avoid layout
  shift when data arrives.
