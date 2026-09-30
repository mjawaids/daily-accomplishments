/* DailyWins — onboarding intro helpers: the "seen it" flag, first-sign-in
   detection, and the ?tour=1 deep link. Kept free of React so it can be tested. */

export const ONBOARDED_KEY = 'dw_onboarded';

/** A first sign-in lands within this long of the account being created. */
const FIRST_SIGN_IN_WINDOW_MS = 60 * 1000;
/** Past this, a "fresh" account is someone who signed up and never came back
    until much later; they are not shown the intro unasked. */
const FRESH_ACCOUNT_MAX_AGE_MS = 15 * 60 * 1000;

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* private mode — the intro may show again on this browser, which is acceptable */
  }
}

interface SignInTimes {
  created_at?: string | null;
  last_sign_in_at?: string | null;
}

/** True when this session is the account's first sign-in, e.g. a brand-new
    Google account returning from the OAuth redirect (which never goes through
    the email sign-up form). */
export function isFreshSignup(user: SignInTimes | null | undefined, now: number = Date.now()): boolean {
  if (!user?.created_at || !user.last_sign_in_at) return false;
  const created = Date.parse(user.created_at);
  const lastSignIn = Date.parse(user.last_sign_in_at);
  if (Number.isNaN(created) || Number.isNaN(lastSignIn)) return false;
  return Math.abs(lastSignIn - created) <= FIRST_SIGN_IN_WINDOW_MS && now - created <= FRESH_ACCOUNT_MAX_AGE_MS;
}

/** `?tour=1` asks the app to open the intro tour. */
export function wantsTour(search: string): boolean {
  return new URLSearchParams(search).get('tour') === '1';
}

/** The query string without `tour`, with its leading `?` (or '' when empty). */
export function stripTourParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('tour');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
