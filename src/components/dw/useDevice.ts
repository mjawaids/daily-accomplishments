/* DailyWins — responsive helpers shared by the shell and standalone screens. */
import { useEffect, useState } from 'react';
import type { Theme } from './WinsProvider';

export type Device = 'mobile' | 'desktop';

const DESKTOP_MIN = 1024;

/** 'desktop' at >= 1024px wide, otherwise 'mobile'. Drives the CSS data-device switch. */
export function useDevice(): Device {
  const get = (): Device =>
    typeof window !== 'undefined' && window.innerWidth >= DESKTOP_MIN ? 'desktop' : 'mobile';
  const [device, setDevice] = useState<Device>(get);
  useEffect(() => {
    const onResize = () => setDevice(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return device;
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/** Resolve a Theme preference ('light' | 'dark' | 'sync') to an applied 'light' | 'dark'. */
export function useResolvedTheme(theme: Theme): 'light' | 'dark' {
  const resolve = (): 'light' | 'dark' =>
    theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : systemDark() ? 'dark' : 'light';
  const [resolved, setResolved] = useState<'light' | 'dark'>(resolve);
  useEffect(() => {
    setResolved(resolve());
    if (theme !== 'sync' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setResolved(systemDark() ? 'dark' : 'light');
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  // keep the document in sync so Tailwind marketing pages match the app theme
  useEffect(() => {
    const root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [resolved]);
  return resolved;
}

/** Read the persisted theme preference (used by screens rendered outside the provider). */
export function getStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem('dw_prefs');
    if (raw) {
      const t = (JSON.parse(raw) as { theme?: Theme }).theme;
      if (t === 'light' || t === 'dark' || t === 'sync') return t;
    }
  } catch {
    /* ignore */
  }
  return 'light';
}
