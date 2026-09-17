/* DailyWins — OneSignal Web SDK v16 wrapper.

   The SDK is imported lazily so that logged-out visitors and the marketing /
   policy pages never pay for it, and so init() can never run without a session.

   Security note: the Web SDK has no Identity Verification (that feature is
   mobile-SDK-only), so anyone can call OneSignal.login('<id>') from the console
   and start receiving that id's pushes. We therefore log in with the opaque
   `push_alias` from user_settings rather than the Supabase user id, and the
   reminder payload is kept free of personal data. See the migration for detail. */

import type OneSignalType from 'react-onesignal';

export type PushState =
  | 'unsupported' // no Notification/PushManager — includes iOS Safari in a tab
  | 'default' // never asked
  | 'denied' // blocked at the browser level; cannot re-prompt
  | 'granted-off' // permission granted, but opted out of this app
  | 'granted-on';

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

let sdk: typeof OneSignalType | null = null;
let initPromise: Promise<boolean> | null = null;
const listeners = new Set<(s: PushState) => void>();

/* Marks that this browser has at some point been aliased to a user. Lets us skip
   loading the SDK on a logged-out visit unless there is actually a stale alias
   to clear — see clearPushAliasIfStale(). */
const ALIAS_FLAG = 'dw_push_aliased';

function setAliasFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(ALIAS_FLAG, '1');
    else localStorage.removeItem(ALIAS_FLAG);
  } catch {
    /* private mode / quota — the flag is only an optimisation */
  }
}

export function isPushSupported(): boolean {
  // Deliberately checks the raw browser APIs rather than the SDK's own
  // isPushSupported(), so the settings toggle can render correctly before the
  // SDK has loaded. Returns false in an iOS Safari tab, which is what we want.
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** iOS/iPadOS can do web push from 16.4, but only when launched from the Home Screen. */
export function isIosNeedsInstall(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; the touch-point check disambiguates.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  return !window.matchMedia('(display-mode: standalone)').matches;
}

/** Idempotent. Resolves false when unsupported or VITE_ONESIGNAL_APP_ID is unset. */
export function initOneSignal(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!isPushSupported()) return false;
    if (!APP_ID) {
      console.warn('[onesignal] VITE_ONESIGNAL_APP_ID is not set; push disabled');
      return false;
    }
    try {
      const mod = await import('react-onesignal');
      const OneSignal = mod.default;
      await OneSignal.init({
        appId: APP_ID,
        // The app already owns a service worker at the root scope (public/sw.js),
        // so OneSignal's must live in its own subdirectory with a matching scope.
        serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/onesignal/' },
        // The Subscription Bell is disabled by default and we leave it that way:
        // subscription is driven from the Profile toggle, and OneSignal's
        // floating bell would clash with the .dw-* design system.
        autoResubscribe: true,
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
      });
      sdk = OneSignal;

      const emit = () => {
        const s = getPushState();
        listeners.forEach((cb) => cb(s));
      };
      OneSignal.Notifications.addEventListener('permissionChange', emit);
      OneSignal.User.PushSubscription.addEventListener('change', emit);
      return true;
    } catch (err) {
      console.error('[onesignal] init failed:', err);
      // Allow a later retry rather than wedging push for the whole page life.
      initPromise = null;
      return false;
    }
  })();
  return initPromise;
}

export function getPushState(): PushState {
  if (!isPushSupported()) return 'unsupported';
  const native = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  if (native === 'denied') return 'denied';
  if (native === 'default') return 'default';
  // Granted at the browser level — the SDK decides whether we're actually opted in.
  if (!sdk) return 'granted-off';
  return sdk.User.PushSubscription.optedIn ? 'granted-on' : 'granted-off';
}

export function onPushStateChange(cb: (s: PushState) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function loginPushAlias(alias: string): Promise<void> {
  if (!(await initOneSignal()) || !sdk) return;
  try {
    await sdk.login(alias);
    setAliasFlag(true);
  } catch (err) {
    console.error('[onesignal] login failed:', err);
  }
}

export async function logoutPush(): Promise<void> {
  // Only meaningful if the SDK actually loaded in this page; don't force-init
  // just to log out. clearPushAliasIfStale() handles the cold case.
  if (!sdk) return;
  try {
    await sdk.logout();
    setAliasFlag(false);
  } catch (err) {
    console.error('[onesignal] logout failed:', err);
  }
}

/* Shared-device safety net: if someone enabled push and then closed the tab
   without signing out, this browser's subscription stays aliased to them and
   keeps receiving their reminders. Called once at startup when there is no
   session. Loads the SDK only when this browser was actually aliased, so a
   normal logged-out visit still pays nothing. */
export async function clearPushAliasIfStale(): Promise<void> {
  try {
    if (localStorage.getItem(ALIAS_FLAG) !== '1') return;
  } catch {
    return;
  }
  if (!(await initOneSignal()) || !sdk) return;
  try {
    await sdk.logout();
    setAliasFlag(false);
  } catch (err) {
    console.error('[onesignal] stale alias cleanup failed:', err);
  }
}

/** init → requestPermission → optIn. Returns the resulting state. */
export async function enablePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  // requestPermission() resolves without showing anything when permission is
  // already denied, which would otherwise leave the toggle silently refusing to
  // move. Check first so the UI can explain itself.
  if (Notification.permission === 'denied') return 'denied';
  if (!(await initOneSignal()) || !sdk) return 'unsupported';
  try {
    if (Notification.permission !== 'granted') {
      await sdk.Notifications.requestPermission();
    }
    if (Notification.permission !== 'granted') return getPushState();
    await sdk.User.PushSubscription.optIn();
  } catch (err) {
    console.error('[onesignal] enable failed:', err);
  }
  return getPushState();
}

/** Opts out of this app. Never attempts to revoke the browser-level permission. */
export async function disablePush(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.User.PushSubscription.optOut();
  } catch (err) {
    console.error('[onesignal] disable failed:', err);
  }
}

/** True when the SDK believes this device is subscribed. Used to reconcile the
    stored push_enabled flag against reality on mount. */
export function isOptedIn(): boolean | undefined {
  return sdk?.User.PushSubscription.optedIn;
}
