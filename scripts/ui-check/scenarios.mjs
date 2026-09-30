// @ts-check
/* Fixture data for `npm run ui:check`: what the fake Supabase serves to the
   signed-in screens. Dates are relative to now so streaks, "Today" headers and
   the 12-week heatmap look like a real account. Shapes follow the Database
   type in src/lib/supabase.ts and are checked by `npm run typecheck:ui-check`. */

/** @typedef {import('../../src/lib/supabase').Database['public']['Tables']} Tables */
/** @typedef {Tables['accomplishments']['Row']} Win */
/** @typedef {Tables['categories']['Row']} CategoryRow */
/** @typedef {Tables['user_settings']['Row']} SettingsRow */
/**
 * @typedef {object} Scenario
 * @property {string} description
 * @property {CategoryRow[]} categories
 * @property {Win[]} accomplishments
 * @property {SettingsRow} settings
 * @property {number} [restStatus] Every REST call answers with this status (e.g. 500).
 * @property {boolean} [offline] Take the browser offline once the app has loaded.
 */

export const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'sam@example.com',
  // Old enough that the app doesn't treat this as a fresh sign-up and open the intro.
  created_at: '2026-01-05T09:00:00Z',
  user_metadata: { full_name: 'Sam Rivera' },
};

const NOW = new Date();
/** @param {number} daysAgo */
const iso = (daysAgo, hour = 10, minute = 0) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
/** @param {string} prefix @param {number} n */
const uuid = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

/**
 * @param {number} n @param {string} name @param {string} color @param {string} icon
 * @param {CategoryRow['legacy_key']} [legacy_key]
 * @returns {CategoryRow}
 */
function category(n, name, color, icon, legacy_key = null) {
  return {
    id: uuid('c0000000', n),
    user_id: USER.id,
    name,
    color,
    icon,
    position: n,
    legacy_key,
    created_at: USER.created_at,
    updated_at: USER.created_at,
  };
}

const DEFAULTS = [
  category(0, 'Work', 'blue', 'briefcase', 'work'),
  category(1, 'Personal', 'rose', 'heartHand', 'personal'),
  category(2, 'Learning', 'violet', 'book', 'learning'),
  category(3, 'Health', 'green', 'activity', 'health'),
];

const TEXTS = [
  'Shipped the onboarding tour to production',
  'Ran 5k before breakfast',
  'Finished chapter 4 of Designing Data-Intensive Applications',
  'Called Mum and planned the weekend trip',
  'Reviewed three pull requests and unblocked the release',
  'Cooked dinner instead of ordering in',
  'Wrote the retro notes and shared them with the team',
  'Did 20 minutes of Spanish on the train',
  'Fixed the flaky login test',
  'Cleared my inbox to zero',
];

/**
 * @param {number} n @param {number} daysAgo @param {CategoryRow} cat @param {string} text @param {number} hour
 * @returns {Win}
 */
function win(n, daysAgo, cat, text, hour) {
  const created = iso(daysAgo, hour, (n * 7) % 60);
  return {
    id: uuid('a0000000', n),
    user_id: USER.id,
    text,
    category_id: cat.id,
    category: cat.legacy_key,
    created_at: created,
    updated_at: created,
  };
}

/**
 * Wins on `days` (days ago), one to three a day, cycling categories and texts.
 * @param {number[]} days @param {CategoryRow[]} cats
 */
function history(days, cats) {
  /** @type {Win[]} */
  const out = [];
  let n = 0;
  for (const d of days) {
    const count = 1 + (d % 3);
    for (let i = 0; i < count; i++, n++) {
      out.push(win(n, d, cats[n % cats.length], TEXTS[n % TEXTS.length], 9 + i * 3));
    }
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** @returns {SettingsRow} */
function settings() {
  return {
    user_id: USER.id,
    push_alias: '00000000-0000-4000-8000-0000000000aa',
    push_enabled: false,
    evening_reminder_enabled: false,
    reminder_local_time: '20:00:00',
    timezone: 'UTC',
    weekly_digest_enabled: false,
    created_at: USER.created_at,
    updated_at: USER.created_at,
  };
}

// A 5-day streak ending today, then a scattered 10 weeks.
const DEFAULT_DAYS = [0, 1, 2, 3, 4, 6, 8, 9, 12, 15, 16, 19, 23, 26, 30, 33, 37, 41, 44, 50, 55, 61, 68];

const BUSY_CATEGORIES = [
  ...DEFAULTS,
  ...[
    ['Side project', 'amber', 'star'],
    ['Open source', 'teal', 'target'],
    ['Family', 'orange', 'home'],
    ['Finances', 'slate', 'chart'],
    ['Writing', 'blue', 'mail'],
    ['Photography', 'rose', 'image'],
    ['Mentoring', 'violet', 'user'],
    ['Meditation', 'green', 'spark'],
    ['Cooking', 'amber', 'flame'],
    ['Volunteering', 'teal', 'flag'],
    ['Travel plans', 'orange', 'calendar'],
    ['Deep work', 'slate', 'clock'],
    ['Garden', 'green', 'activity'],
    ['Music practice', 'violet', 'book'],
    ['Home repairs', 'orange', 'home'],
    ['A very long cat name', 'blue', 'briefcase'],
  ].map(([name, color, icon], i) => category(4 + i, name, color, icon)),
];

const LONG_TEXT =
  'Finally untangled the billing migration: rewrote the proration logic, backfilled 14,000 invoices, ' +
  'paired with finance on the edge cases, and wrote a runbook so nobody has to rediscover any of this ' +
  'next quarter. Longest single win so far and worth writing down properly.';

/** @type {Record<string, Scenario>} */
export const SCENARIOS = {
  default: {
    description: 'Four default categories, a 5-day streak and about ten weeks of history.',
    categories: DEFAULTS,
    accomplishments: history(DEFAULT_DAYS, DEFAULTS),
    settings: settings(),
  },
  empty: {
    description: 'A new account: default categories, no wins yet.',
    categories: DEFAULTS,
    accomplishments: [],
    settings: settings(),
  },
  busy: {
    description: 'The maximum 20 categories, a 60-day streak and a very long win.',
    categories: BUSY_CATEGORIES,
    accomplishments: [
      win(9999, 0, BUSY_CATEGORIES[19], LONG_TEXT, 8),
      ...history(Array.from({ length: 60 }, (_, i) => i), BUSY_CATEGORIES),
    ],
    settings: settings(),
  },
  error: {
    description: 'Every database request fails with a 500.',
    categories: DEFAULTS,
    accomplishments: [],
    settings: settings(),
    restStatus: 500,
  },
  offline: {
    description: 'Loads the default data, then the device goes offline.',
    categories: DEFAULTS,
    accomplishments: history(DEFAULT_DAYS, DEFAULTS),
    settings: settings(),
    offline: true,
  },
};
