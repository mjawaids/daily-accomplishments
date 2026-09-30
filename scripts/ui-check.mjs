/* Visual + accessibility check for UI work (`npm run ui:check`).
   Starts the Vite dev server, opens each screen at phone and desktop widths in
   light and dark, saves a screenshot per combination to ui-shots/, and runs an
   axe-core WCAG 2.2 AA scan. Exits non-zero on any serious/critical violation.

   Signed-in screens run against a fake Supabase inside the browser
   (scripts/ui-check/fake-supabase.mjs) loaded with a fixture scenario
   (scripts/ui-check/scenarios.mjs). No account or secret is needed, and the
   check never contacts a real Supabase project: requests to any host other
   than the dev server, the fake and Google Fonts are blocked and reported.

   Options:
     --only=<screen,...>        limit screens (signin, pricing, timeline, add, ...)
     --scenario=<name,...>      fixture scenarios for signed-in screens (default: default; "all" for every one)
     --accent=<name,...>        brand accents to render (default: sunrise, the one the app ships; "all" for
                                sunrise, forest, indigo and berry). Other accents add -<accent> to file names.
     --no-axe                   skip the accessibility scan

   Screens whose content scrolls also get a <name>-full.png with the whole
   scroll area laid out, so what's below the fold can be reviewed too. */
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { SCENARIOS } from './ui-check/scenarios.mjs';
import { installFakeSupabase, FAKE_URL, FAKE_ANON_KEY } from './ui-check/fake-supabase.mjs';

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = arg('only')?.split(',');
const scenarioArg = arg('scenario') ?? 'default';
const scenarioNames = scenarioArg === 'all' ? Object.keys(SCENARIOS) : scenarioArg.split(',');
const unknown = scenarioNames.filter((n) => !SCENARIOS[n]);
if (unknown.length) {
  console.error(`Unknown scenario(s): ${unknown.join(', ')}. Available: ${Object.keys(SCENARIOS).join(', ')}.`);
  process.exit(2);
}
const ACCENTS = ['sunrise', 'forest', 'indigo', 'berry'];
const accentArg = arg('accent') ?? 'sunrise';
const accents = accentArg === 'all' ? ACCENTS : accentArg.split(',');
const badAccents = accents.filter((a) => !ACCENTS.includes(a));
if (badAccents.length) {
  console.error(`Unknown accent(s): ${badAccents.join(', ')}. Available: ${ACCENTS.join(', ')}.`);
  process.exit(2);
}
const runAxe = !args.includes('--no-axe');
const OUT = 'ui-shots';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];
const THEMES = ['light', 'dark'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Always point the app at the fake, whatever .env says, so the check can never
// reach a real project. Vite gives process.env priority over .env files.
process.env.VITE_SUPABASE_URL = FAKE_URL;
process.env.VITE_SUPABASE_ANON_KEY = FAKE_ANON_KEY;

const SIGNED_IN_READY = '.dw-app [title="Profile"]';
const signedOut = [
  { name: 'signin', path: '/?auth=signin', ready: 'form' },
  { name: 'signup', path: '/?auth=signup', ready: 'form' },
  { name: 'pricing', path: '/pricing' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'refund', path: '/refund' },
];
const signedIn = [
  { name: 'timeline', path: '/', ready: SIGNED_IN_READY },
  {
    name: 'insights',
    path: '/',
    ready: SIGNED_IN_READY,
    go: (p) => p.locator('.dw-navitem, .dw-tab').filter({ hasText: 'Insights' }).first().click(),
  },
  { name: 'profile', path: '/', ready: SIGNED_IN_READY, go: (p) => p.locator('[title="Profile"]').first().click() },
  {
    name: 'add',
    path: '/',
    ready: SIGNED_IN_READY,
    go: async (p, vp) => {
      if (vp.name === 'desktop') {
        await p.locator('.dw-sidebar .dw-btn').first().click();
      } else {
        await p.locator('.dw-composer textarea').click();
        await p.locator('[title="More options (date, etc.)"]').click();
      }
      await p.waitForSelector('.dw-sheet');
    },
  },
  {
    // Search and filter panel open, one category picked. Needs wins to search.
    name: 'search',
    path: '/',
    ready: SIGNED_IN_READY,
    go: async (p) => {
      const toggle = p.locator('[aria-controls="dw-filterpanel"]');
      if (!(await toggle.count())) return false;
      await toggle.click();
      await p.locator('#dw-filterpanel .dw-chip.selectable').first().click();
      await p.waitForTimeout(400); // the chips' staggered reveal
    },
  },
  {
    // The category editor sheet, opened from Profile.
    name: 'category',
    path: '/',
    ready: SIGNED_IN_READY,
    go: async (p) => {
      await p.locator('[title="Profile"]').first().click();
      await p.locator('.dw-prefcard button.dw-prefrow').first().click();
      await p.waitForSelector('.dw-sheet');
    },
  },
  {
    // The evening-reminder prompt. It needs a browser that has never been
    // asked for notification permission, and shows after a 2.5s delay.
    name: 'push',
    path: '/',
    ready: SIGNED_IN_READY,
    setup: (p) =>
      p.addInitScript(() => {
        if ('Notification' in window) Object.defineProperty(Notification, 'permission', { get: () => 'default' });
      }),
    go: (p) =>
      p
        .getByText(/Want an evening nudge|Add reminders on this device/)
        .waitFor({ timeout: 8000 })
        .then(() => true, () => false),
  },
  {
    // The install prompt, fed a stand-in beforeinstallprompt event.
    name: 'install',
    path: '/',
    ready: SIGNED_IN_READY,
    go: async (p) => {
      await p.evaluate(() => {
        const e = Object.assign(new Event('beforeinstallprompt'), {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: 'dismissed' }),
        });
        window.dispatchEvent(e);
      });
      await p.getByText('Install DailyWins').waitFor({ timeout: 8000 });
    },
  },
  {
    // The "new version available" banner (see pwa-register-stub.mjs).
    name: 'update',
    path: '/',
    ready: SIGNED_IN_READY,
    setup: (p) =>
      p.addInitScript(() => {
        window.__UI_CHECK_NEED_REFRESH__ = true;
      }),
  },
  { name: 'tour', path: '/?tour=1', ready: '.dw-app' },
  {
    // Logs a win from the composer and shows what follows: the success toast,
    // or, in the error and offline scenarios, what a save that didn't reach the
    // server looks like. Last, because it writes to the scenario's data.
    name: 'log',
    path: '/',
    ready: SIGNED_IN_READY,
    go: async (p, _vp, { context, scenario }) => {
      if (SCENARIOS[scenario].offline) await context.setOffline(true);
      await p.locator('.dw-composer textarea').click();
      await p.keyboard.type('Wrote the quarterly plan');
      await p.locator('.dw-composer .dw-btn').click();
      await p.waitForTimeout(600);
    },
  },
];

const pick = (list) => (only ? list.filter((s) => only.includes(s.name)) : list);

// Cloud sessions ship a pinned Chromium; locally use `npx playwright install chromium`.
const executablePath =
  process.env.UI_CHECK_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const server = await createServer({
  server: { port: 5199, strictPort: false },
  logLevel: 'error',
  resolve: {
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./ui-check/pwa-register-stub.mjs', import.meta.url)),
    },
  },
});
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ executablePath });
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const problems = [];
const skipped = new Set();
const fakeGaps = new Set();
const blockedHosts = new Set();
let shots = 0;

/** Re-point every .dw-app at `accent` (the app hard-codes sunrise). */
async function applyAccent(context, accent) {
  if (accent === 'sunrise') return;
  await context.addInitScript((a) => {
    const set = () =>
      document.querySelectorAll('.dw-app').forEach((el) => {
        if (el.getAttribute('data-accent') !== a) el.setAttribute('data-accent', a);
      });
    new MutationObserver(set).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-accent'],
    });
  }, accent);
}

async function newContext(vp, theme, scenario, accent) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: theme,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  await applyAccent(context, accent);
  // Registered first, so the fake's own route (registered after) wins for its host.
  await context.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(hostname) || /(^|\.)(googleapis|gstatic)\.com$/.test(hostname)) {
      return route.continue();
    }
    blockedHosts.add(hostname);
    return route.abort();
  });
  // Signed-in screens take their theme from the dw_prefs preference (default
  // Auto, which follows colorScheme); set it explicitly so each run is exact.
  await context.addInitScript((t) => {
    try {
      const prefs = JSON.parse(localStorage.getItem('dw_prefs') || '{}');
      localStorage.setItem('dw_prefs', JSON.stringify({ ...prefs, theme: t }));
    } catch {
      /* storage unavailable: the app falls back to its default */
    }
  }, theme);
  await installFakeSupabase(context, SCENARIOS[scenario ?? 'default'], (msg) => fakeGaps.add(msg));
  return context;
}

// Lays the scroll area out at full height, for the -full screenshot.
const FULL_CSS = `
  .dw-app{height:auto!important;overflow:visible!important}
  .dw-main,.dw-sidebar{height:auto!important}
  .dw-scroll{overflow:visible!important;flex:none!important}`;

async function check(context, screen, vp, theme, scenario, accent) {
  const page = await context.newPage();
  if (screen.setup) await screen.setup(page);
  await page.goto(base + screen.path, { waitUntil: 'networkidle' });
  if (screen.ready) await page.waitForSelector(screen.ready, { timeout: 15000 });
  const label = (scenario ? `${screen.name}-${scenario}` : screen.name) + (accent === 'sunrise' ? '' : `-${accent}`);
  if (screen.go) {
    if ((await screen.go(page, vp, { context, scenario })) === false) {
      // The state doesn't exist in this scenario (no wins to search, say).
      skipped.add(label);
      if (scenario && SCENARIOS[scenario].offline) await context.setOffline(false);
      await page.close();
      return;
    }
    await page.waitForLoadState('networkidle');
  }
  if (scenario && SCENARIOS[scenario].offline) await context.setOffline(true);
  await page.waitForTimeout(400); // let entrance animations and offline banners settle
  const file = `${OUT}/${label}-${vp.name}-${theme}`;
  await page.screenshot({ path: `${file}.png`, fullPage: true });
  shots++;
  const scrolls = await page.evaluate(() =>
    [...document.querySelectorAll('.dw-scroll')].some((el) => el.scrollHeight > el.clientHeight + 1)
  );
  if (scrolls) {
    const style = await page.addStyleTag({ content: FULL_CSS });
    await page.screenshot({ path: `${file}-full.png`, fullPage: true });
    await style.evaluate((el) => el.remove());
    shots++;
  }
  if (runAxe) {
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    for (const v of violations) {
      problems.push({
        screen: label,
        variant: `${vp.name}/${theme}`,
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        target: v.nodes[0]?.target.join(' '),
      });
    }
  }
  if (scenario && SCENARIOS[scenario].offline) await context.setOffline(false);
  await page.close();
}

try {
  for (const accent of accents) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        if (pick(signedOut).length) {
          // No session planted: these screens must render signed out.
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme,
            reducedMotion: 'reduce',
            serviceWorkers: 'block',
          });
          await applyAccent(context, accent);
          for (const s of pick(signedOut)) await check(context, s, vp, theme, undefined, accent);
          await context.close();
        }
        for (const scenario of scenarioNames) {
          if (!pick(signedIn).length) continue;
          // One context per scenario. Only the last screen (log) saves anything.
          const context = await newContext(vp, theme, scenario, accent);
          for (const s of pick(signedIn)) await check(context, s, vp, theme, scenario, accent);
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(`Saved ${shots} screenshots to ${OUT}/ (scenarios: ${scenarioNames.join(', ')}; accents: ${accents.join(', ')}).`);
if (skipped.size) console.log(`Skipped, as the state doesn't exist there: ${[...skipped].sort().join(', ')}.`);
if (blockedHosts.size) console.log(`Blocked requests to: ${[...blockedHosts].sort().join(', ')}.`);
if (fakeGaps.size) {
  console.log('The fake Supabase could not answer these calls; extend scripts/ui-check/fake-supabase.mjs:');
  for (const g of fakeGaps) console.log(`  ${g}`);
  process.exitCode = 1;
}

if (runAxe) {
  // Same rule failing on every viewport/theme is one problem: group it.
  const grouped = new Map();
  for (const p of problems) {
    const key = `${p.impact}|${p.id}|${p.screen}`;
    const g = grouped.get(key) ?? { ...p, variants: [] };
    g.variants.push(p.variant);
    grouped.set(key, g);
  }
  const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const list = [...grouped.values()].sort((a, b) => rank[a.impact] - rank[b.impact]);
  for (const g of list) {
    console.log(`[${g.impact}] ${g.id} on ${g.screen} (${g.variants.join(', ')}): ${g.help}; ${g.nodes} node(s), e.g. ${g.target}`);
  }
  const blocking = list.filter((g) => g.impact === 'critical' || g.impact === 'serious');
  console.log(list.length ? `axe: ${list.length} issue(s), ${blocking.length} serious/critical.` : 'axe: no WCAG 2.2 AA violations.');
  if (blocking.length) process.exitCode = 1;
}
