import { afterEach, describe, expect, it, vi } from 'vitest';

/* gtag.js only executes dataLayer entries that are Arguments objects; a plain
   array (what `function gtag(...args) { dataLayer.push(args) }` produces) is
   ignored, and GA then reports "No data received". These tests pin that down. */

const isArguments = (value: unknown) => Object.prototype.toString.call(value) === '[object Arguments]';

async function load() {
  const head = { appendChild: vi.fn() };
  vi.stubGlobal('document', {
    title: 'Daily Wins',
    head,
    createElement: () => ({}),
  });
  vi.stubGlobal('window', { location: { href: 'https://example.test/' } });
  vi.stubEnv('VITE_GA_TRACKING_ID', 'G-TEST123');
  vi.resetModules();
  const mod = await import('./analytics');
  return { mod, head, win: window as unknown as { dataLayer: unknown[] } };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('initGA', () => {
  it('loads gtag.js for the measurement ID', async () => {
    const { mod, head } = await load();
    mod.initGA();
    expect(head.appendChild).toHaveBeenCalledWith(
      expect.objectContaining({ async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123' })
    );
  });

  it('queues js and config as Arguments objects, not arrays', async () => {
    const { mod, win } = await load();
    mod.initGA();
    expect(win.dataLayer).toHaveLength(2);
    for (const entry of win.dataLayer) {
      expect(isArguments(entry)).toBe(true);
      expect(Array.isArray(entry)).toBe(false);
    }
    const [js, config] = win.dataLayer as ArrayLike<unknown>[];
    expect(js[0]).toBe('js');
    expect(Array.from(config).slice(0, 2)).toEqual(['config', 'G-TEST123']);
  });

  it('queues later events as Arguments objects too', async () => {
    const { mod, win } = await load();
    mod.initGA();
    mod.trackAuthEvent('signin');
    const last = win.dataLayer[win.dataLayer.length - 1] as ArrayLike<unknown>;
    expect(isArguments(last)).toBe(true);
    expect(Array.from(last).slice(0, 2)).toEqual(['event', 'signin']);
  });

  it('does nothing without a measurement ID', async () => {
    const { head } = await load();
    vi.stubEnv('VITE_GA_TRACKING_ID', '');
    vi.resetModules();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('./analytics');
    mod.initGA();
    expect(head.appendChild).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
