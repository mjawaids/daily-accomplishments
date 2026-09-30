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
     --no-axe                   skip the accessibility scan */
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
  { name: 'tour', path: '/?tour=1', ready: '.dw-app' },
];

const pick = (list) => (only ? list.filter((s) => only.includes(s.name)) : list);

// Cloud sessions ship a pinned Chromium; locally use `npx playwright install chromium`.
const executablePath =
  process.env.UI_CHECK_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ executablePath });
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const problems = [];
const fakeGaps = new Set();
const blockedHosts = new Set();
let shots = 0;

async function newContext(vp, theme, scenario) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: theme,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
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
  // light), not the OS setting, so set it explicitly.
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

async function check(context, screen, vp, theme, scenario) {
  const page = await context.newPage();
  await page.goto(base + screen.path, { waitUntil: 'networkidle' });
  if (screen.ready) await page.waitForSelector(screen.ready, { timeout: 15000 });
  if (screen.go) {
    await screen.go(page, vp);
    await page.waitForLoadState('networkidle');
  }
  if (scenario && SCENARIOS[scenario].offline) await context.setOffline(true);
  await page.waitForTimeout(400); // let entrance animations and offline banners settle
  const label = scenario ? `${screen.name}-${scenario}` : screen.name;
  await page.screenshot({ path: `${OUT}/${label}-${vp.name}-${theme}.png`, fullPage: true });
  shots++;
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
        for (const s of pick(signedOut)) await check(context, s, vp, theme);
        await context.close();
      }
      for (const scenario of scenarioNames) {
        if (!pick(signedIn).length) continue;
        // One context per scenario: screens only open views, they don't save.
        const context = await newContext(vp, theme, scenario);
        for (const s of pick(signedIn)) await check(context, s, vp, theme, scenario);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(`Saved ${shots} screenshots to ${OUT}/ (scenarios: ${scenarioNames.join(', ')}).`);
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
