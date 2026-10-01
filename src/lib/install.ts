/* Installing DailyWins as an app (it is a PWA; there are no store builds).

   Browsers differ in what a page can do here, so every "Install app" entry
   point reads one mode from this module:
   - 'prompt'     Chromium (Chrome, Edge, Samsung Internet) fired
                  beforeinstallprompt; our button opens the browser's own
                  install dialog.
   - 'ios'        iPhone/iPad. No API to trigger an install, so we show the
                  Share → Add to Home Screen steps.
   - 'mac-safari' Safari 17+ on macOS. Same again, with File → Add to Dock.
   - 'installed'  Already running as the installed app: offer nothing.
   - 'none'       No install path to drive or explain (Firefox, or Chromium
                  that hasn't fired the event): offer nothing.

   beforeinstallprompt fires once per page load, often before React mounts and
   usually while the user is still on the sign-in screen, so the listener is
   attached at startup by initInstall() rather than by the components that show
   the buttons. */
import { useSyncExternalStore } from 'react';
import { trackPWAEvent } from './analytics';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'prompt' | 'ios' | 'mac-safari' | 'installed' | 'none';

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; the touch-point check disambiguates.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Safari on macOS from version 17 (Sonoma), which added File → Add to Dock. */
function isMacSafariWithDock(): boolean {
  const ua = navigator.userAgent;
  if (!/Macintosh/.test(ua) || navigator.maxTouchPoints > 1) return false;
  if (!/Safari\//.test(ua) || /Chrome|Chromium|Edg\/|OPR\/|Firefox/.test(ua)) return false;
  const v = /Version\/(\d+)/.exec(ua);
  return !!v && Number(v[1]) >= 17;
}

export function getInstallMode(): InstallMode {
  if (typeof window === 'undefined') return 'none';
  if (installedNow || isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  if (isMacSafariWithDock()) return 'mac-safari';
  return 'none';
}

/** Idempotent. Call once at startup, before the app renders. */
export function initInstall(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stops Chrome's own mini-infobar; our entry points offer the install instead.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installedNow = true;
    deferred = null;
    emit();
  });
}

/** Opens the browser's install dialog. Only meaningful in 'prompt' mode. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred;
  if (!e) return 'unavailable';
  // The event can only be used once, whatever the user picks.
  deferred = null;
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'accepted') installedNow = true;
    trackPWAEvent(outcome === 'accepted' ? 'install_accepted' : 'install_dismissed');
    return outcome;
  } catch (error) {
    console.error('Error during installation:', error);
    return 'unavailable';
  } finally {
    emit();
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getInstallMode, () => 'none' as InstallMode);
}

/** True when there is an install to offer on this device. */
export const canOfferInstall = (mode: InstallMode) => mode === 'prompt' || mode === 'ios' || mode === 'mac-safari';
