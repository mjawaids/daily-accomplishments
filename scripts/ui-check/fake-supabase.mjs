/* A fake Supabase for `npm run ui:check`, served from inside the browser with
   Playwright routes. It plants a signed-in session and answers the app's auth,
   REST and RPC calls from a scenario's fixtures (scenarios.mjs), so the
   signed-in screens render with no real account, secret or network access.

   It covers what the app calls today: auth getSession/getUser/signOut; REST
   select/insert/upsert/update/delete with eq filters and ordering; the
   single-object Accept header; any RPC (answered 204). Anything else answers
   501 and is reported, so a new kind of call shows up instead of passing
   silently. */
import { USER } from './scenarios.mjs';

export const FAKE_URL = 'https://uicheck.supabase.co';
export const FAKE_ANON_KEY = 'ui-check-anon-key';
// supabase-js stores the session under sb-<first host label>-auth-token.
const STORAGE_KEY = 'sb-uicheck-auth-token';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range',
};

const authUser = {
  id: USER.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: USER.email,
  created_at: USER.created_at,
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: USER.user_metadata,
  identities: [],
};

const session = {
  access_token: 'ui-check-access-token',
  refresh_token: 'ui-check-refresh-token',
  token_type: 'bearer',
  expires_in: 10 * 365 * 24 * 3600,
  // Far in the future so supabase-js never tries to refresh it.
  expires_at: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600,
  user: authUser,
};

/** Apply PostgREST `col=eq.value` filters. */
function filterRows(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const m = /^eq\.(.*)$/.exec(value);
    if (!m) throw new Error(`unsupported filter ${key}=${value}`);
    out = out.filter((r) => String(r[key]) === m[1]);
  }
  return out;
}

function orderRows(rows, order) {
  if (!order) return rows;
  const keys = order.split(',').map((part) => {
    const [col, dir] = part.split('.');
    return { col, desc: dir === 'desc' };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      if (a[col] === b[col]) continue;
      return (a[col] < b[col] ? -1 : 1) * (desc ? -1 : 1);
    }
    return 0;
  });
}

/**
 * Install the fake on a browser context.
 * @param {import('playwright').BrowserContext} context
 * @param {import('./scenarios.mjs').Scenario} scenario
 * @param {(msg: string) => void} report called for each call the fake can't answer
 */
export async function installFakeSupabase(context, scenario, report) {
  // Per-context copy, so writes during a run don't leak into the next one.
  const db = {
    accomplishments: structuredClone(scenario.accomplishments),
    categories: structuredClone(scenario.categories),
    user_settings: [structuredClone(scenario.settings)],
  };

  await context.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify(session)]
  );

  await context.route(`${FAKE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status, body, extra = {}) =>
      route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });

    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });

    if (url.pathname === '/auth/v1/user') return json(200, authUser);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS });

    if (url.pathname.startsWith('/rest/v1/')) {
      if (scenario.restStatus) return json(scenario.restStatus, { message: 'ui-check: simulated server error' });
      if (url.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({ status: 204, headers: CORS });

      const table = url.pathname.slice('/rest/v1/'.length);
      if (!(table in db)) {
        report(`${method} ${url.pathname}: no fixture table "${table}"`);
        return json(501, { message: `ui-check: no fixture for ${table}` });
      }
      const single = (req.headers()['accept'] || '').includes('application/vnd.pgrst.object+json');
      const params = url.searchParams;
      let rows;
      try {
        if (method === 'GET' || method === 'HEAD') {
          rows = orderRows(filterRows(db[table], params), params.get('order'));
        } else if (method === 'POST') {
          const body = req.postDataJSON();
          const now = new Date().toISOString();
          rows = (Array.isArray(body) ? body : [body]).map((r) => ({
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
            ...r,
          }));
          db[table].push(...rows);
        } else if (method === 'PATCH') {
          const patch = req.postDataJSON();
          rows = filterRows(db[table], params);
          for (const r of rows) Object.assign(r, patch, { updated_at: new Date().toISOString() });
        } else if (method === 'DELETE') {
          rows = filterRows(db[table], params);
          db[table] = db[table].filter((r) => !rows.includes(r));
        } else {
          throw new Error(`unsupported method ${method}`);
        }
      } catch (err) {
        report(`${method} ${url.pathname}${url.search}: ${err.message}`);
        return json(501, { message: `ui-check: ${err.message}` });
      }
      if (single) {
        if (rows.length !== 1) {
          return json(406, {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
            details: `The result contains ${rows.length} rows`,
            hint: null,
          });
        }
        return json(method === 'POST' ? 201 : 200, rows[0]);
      }
      return json(method === 'POST' ? 201 : 200, rows, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
    }

    report(`${method} ${url.pathname}: not faked`);
    return json(501, { message: 'ui-check: not faked' });
  });
}
