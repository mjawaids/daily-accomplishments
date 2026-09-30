/* Visual + accessibility check for UI work (`npm run ui:check`).
   Starts the Vite dev server, opens each screen at phone and desktop widths in
   light and dark, saves a screenshot per combination to ui-shots/, and runs an
   axe-core WCAG 2.2 AA scan. Exits non-zero on any serious/critical violation.

   Signed-out screens (auth, pricing, policies) always run. Signed-in screens
   (Timeline, Insights, Profile, intro tour) run only when UI_CHECK_EMAIL and
   UI_CHECK_PASSWORD name a throwaway account in the project in .env.

   Options: --only=<name,...> limits screens; --no-axe skips the scan. */
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer, loadEnv } from 'vite';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const runAxe = !args.includes('--no-axe');
const OUT = 'ui-shots';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];
const THEMES = ['light', 'dark'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The app throws on load without Supabase settings (src/lib/supabase.ts).
// Signed-out screens never call Supabase, so placeholders are enough for them.
const env = loadEnv('development', process.cwd(), '');
const hasSupabase = !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
if (!hasSupabase) {
  process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9';
  process.env.VITE_SUPABASE_ANON_KEY = 'ui-check-placeholder';
}
const creds = env.UI_CHECK_EMAIL && env.UI_CHECK_PASSWORD && hasSupabase
  ? { email: env.UI_CHECK_EMAIL, password: env.UI_CHECK_PASSWORD }
  : null;

const signedOut = [
  { name: 'signin', path: '/?auth=signin', ready: 'form' },
  { name: 'signup', path: '/?auth=signup', ready: 'form' },
  { name: 'pricing', path: '/pricing' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'refund', path: '/refund' },
];
const signedIn = [
  { name: 'timeline', path: '/', ready: '.dw-app [title="Profile"]' },
  { name: 'insights', path: '/', ready: '.dw-app [title="Profile"]', go: (p) => p.locator('.dw-navitem, .dw-tab').filter({ hasText: 'Insights' }).first().click() },
  { name: 'profile', path: '/', ready: '.dw-app [title="Profile"]', go: (p) => p.locator('[title="Profile"]').first().click() },
  { name: 'tour', path: '/?tour=1', ready: '.dw-app' },
];

const pick = (list) => (only ? list.filter((s) => only.includes(s.name)) : list);

// Cloud sessions ship a pinned Chromium; locally use `npx playwright install chromium`.
const executablePath = process.env.UI_CHECK_CHROMIUM
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ executablePath });
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const problems = [];
let shots = 0;

async function check(context, screen, vp, theme) {
  const page = await context.newPage();
  await page.goto(base + screen.path, { waitUntil: 'networkidle' });
  if (screen.ready) await page.waitForSelector(screen.ready, { timeout: 15000 });
  if (screen.go) {
    await screen.go(page);
    await page.waitForLoadState('networkidle');
  }
  await page.waitForTimeout(400); // let entrance animations settle
  const file = `${OUT}/${screen.name}-${vp.name}-${theme}.png`;
  await page.screenshot({ path: file, fullPage: true });
  shots++;
  if (runAxe) {
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    for (const v of violations) {
      problems.push({ where: `${screen.name} @ ${vp.name}/${theme}`, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: v.nodes[0]?.target.join(' ') });
    }
  }
  await page.close();
}

async function signIn(context) {
  const page = await context.newPage();
  await page.goto(base + '/?auth=signin', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[placeholder="••••••••"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.dw-app [title="Profile"]', { timeout: 20000 });
  await page.close();
}

try {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const opts = { viewport: { width: vp.width, height: vp.height }, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block' };
      const context = await browser.newContext(opts);
      for (const s of pick(signedOut)) await check(context, s, vp, theme);
      await context.close();

      if (creds && pick(signedIn).length) {
        const authed = await browser.newContext(opts);
        await signIn(authed);
        for (const s of pick(signedIn)) await check(authed, s, vp, theme);
        await authed.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (!creds) {
  console.log('Signed-in screens skipped: set UI_CHECK_EMAIL / UI_CHECK_PASSWORD (and real VITE_SUPABASE_*) in .env to include them.');
}
console.log(`Saved ${shots} screenshots to ${OUT}/.`);

if (runAxe) {
  // Same rule failing on every viewport/theme is one problem: group it.
  const grouped = new Map();
  for (const p of problems) {
    const key = `${p.impact}|${p.id}|${p.where.split(' @ ')[0]}`;
    const g = grouped.get(key) ?? { ...p, variants: [] };
    g.variants.push(p.where.split(' @ ')[1]);
    grouped.set(key, g);
  }
  const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const list = [...grouped.values()].sort((a, b) => rank[a.impact] - rank[b.impact]);
  for (const g of list) {
    console.log(`[${g.impact}] ${g.id} on ${g.where.split(' @ ')[0]} (${g.variants.join(', ')}): ${g.help}; ${g.nodes} node(s), e.g. ${g.target}`);
  }
  const blocking = list.filter((g) => g.impact === 'critical' || g.impact === 'serious');
  console.log(list.length ? `axe: ${list.length} issue(s), ${blocking.length} serious/critical.` : 'axe: no WCAG 2.2 AA violations.');
  if (blocking.length) process.exitCode = 1;
}
