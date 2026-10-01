import { afterEach, describe, expect, it, vi } from 'vitest';

/* install.ts keeps module-level state (the deferred event, installed flag), so
   every test re-imports it fresh against a stubbed window and navigator. */

const track = vi.hoisted(() => vi.fn());
vi.mock('./analytics', () => ({ trackPWAEvent: track }));

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  macSafari17:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  macSafari16:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
};

interface Env {
  ua: string;
  platform?: string;
  touch?: number;
  standalone?: boolean;
}

async function load({ ua, platform = '', touch = 0, standalone = false }: Env) {
  const target = new EventTarget();
  vi.stubGlobal('window', {
    addEventListener: target.addEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    matchMedia: () => ({ matches: standalone }),
    navigator: { userAgent: ua, platform, maxTouchPoints: touch },
  });
  vi.stubGlobal('navigator', { userAgent: ua, platform, maxTouchPoints: touch });
  vi.resetModules();
  const mod = await import('./install');
  mod.initInstall();
  return { mod, fire: (e: Event) => target.dispatchEvent(e) };
}

function installEvent(outcome: 'accepted' | 'dismissed') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  track.mockReset();
});

describe('getInstallMode', () => {
  it('offers nothing in Chromium until beforeinstallprompt fires, then the prompt', async () => {
    const { mod, fire } = await load({ ua: UA.androidChrome });
    expect(mod.getInstallMode()).toBe('none');
    const e = installEvent('dismissed');
    fire(e);
    expect(e.defaultPrevented).toBe(true);
    expect(mod.getInstallMode()).toBe('prompt');
  });

  it('shows steps on iPhone and on iPadOS, which reports as a Mac', async () => {
    expect((await load({ ua: UA.iphone })).mod.getInstallMode()).toBe('ios');
    expect((await load({ ua: UA.macSafari17, platform: 'MacIntel', touch: 5 })).mod.getInstallMode()).toBe('ios');
  });

  it('shows Add to Dock steps only in Safari 17+ on macOS', async () => {
    expect((await load({ ua: UA.macSafari17, platform: 'MacIntel' })).mod.getInstallMode()).toBe('mac-safari');
    expect((await load({ ua: UA.macSafari16, platform: 'MacIntel' })).mod.getInstallMode()).toBe('none');
    expect((await load({ ua: UA.macChrome, platform: 'MacIntel' })).mod.getInstallMode()).toBe('none');
  });

  it('offers nothing in Firefox', async () => {
    expect((await load({ ua: UA.firefox })).mod.getInstallMode()).toBe('none');
  });

  it('offers nothing once running as the installed app', async () => {
    expect((await load({ ua: UA.iphone, standalone: true })).mod.getInstallMode()).toBe('installed');
  });

  it('treats appinstalled as installed', async () => {
    const { mod, fire } = await load({ ua: UA.androidChrome });
    fire(installEvent('dismissed'));
    fire(new Event('appinstalled'));
    expect(mod.getInstallMode()).toBe('installed');
  });
});

describe('promptInstall', () => {
  it('opens the browser dialog once and records an accepted install', async () => {
    const { mod, fire } = await load({ ua: UA.androidChrome });
    const e = installEvent('accepted');
    fire(e);
    expect(await mod.promptInstall()).toBe('accepted');
    expect(e.prompt).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('install_accepted');
    expect(mod.getInstallMode()).toBe('installed');
  });

  it('drops the used event when the user dismisses the dialog', async () => {
    const { mod, fire } = await load({ ua: UA.androidChrome });
    fire(installEvent('dismissed'));
    expect(await mod.promptInstall()).toBe('dismissed');
    expect(track).toHaveBeenCalledWith('install_dismissed');
    expect(mod.getInstallMode()).toBe('none');
    expect(await mod.promptInstall()).toBe('unavailable');
  });
});
