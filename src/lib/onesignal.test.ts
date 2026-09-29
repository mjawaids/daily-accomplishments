import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* The SDK wrapper keeps module-level state (sdk, initPromise, sdkBlocked), so
   every test re-imports it fresh. react-onesignal is replaced by a fake whose
   init() each test controls. That is enough to drive the whole load / block /
   late-adoption state machine without a browser. */

const fake = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  login: vi.fn<() => Promise<void>>(),
  logout: vi.fn<() => Promise<void>>(),
  Notifications: { addEventListener: vi.fn(), requestPermission: vi.fn() },
  User: { PushSubscription: { optedIn: false, addEventListener: vi.fn(), optIn: vi.fn() } },
}));
vi.mock('react-onesignal', () => ({ default: fake }));

type Permission = 'default' | 'granted' | 'denied';

async function load(permission: Permission = 'default') {
  vi.stubGlobal('Notification', { permission });
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('navigator', { serviceWorker: {}, userAgent: '' });
  vi.stubGlobal('window', globalThis);
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubEnv('VITE_ONESIGNAL_APP_ID', 'test-app-id');
  vi.resetModules();
  return import('./onesignal');
}

/* initOneSignal() reaches the SDK through a dynamic import, which the module
   runner resolves over a few real event-loop turns. Advancing the fake clock
   before that happens would fire the 10s timeout before init() is even called,
   so wait for the call first. setImmediate is real (see useFakeTimers below). */
async function untilInitCalled() {
  const deadline = Date.now() + 5_000; // Date is real: only timeouts are faked
  while (fake.init.mock.calls.length === 0 && Date.now() < deadline) {
    await new Promise((r) => setImmediate(r));
  }
  expect(fake.init).toHaveBeenCalledTimes(1);
}

/** A promise plus the handles to settle it from the test. */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  // Only the timer the code under test uses. Faking everything (setImmediate,
  // queueMicrotask, …) also stalls the module runner's dynamic import.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.clearAllMocks();
  fake.login.mockResolvedValue(undefined);
  fake.logout.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('initOneSignal', () => {
  it('attaches the SDK when it loads before the timeout', async () => {
    fake.init.mockResolvedValue(undefined);
    const m = await load();

    await expect(m.initOneSignal()).resolves.toBe(true);
    expect(m.getPushState()).toBe('default');
    expect(fake.Notifications.addEventListener).toHaveBeenCalledTimes(1);
    expect(fake.User.PushSubscription.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('reports blocked when the SDK fails to load, and does not retry', async () => {
    fake.init.mockRejectedValue(new Error('OneSignal script failed to load.'));
    const m = await load();
    const seen: string[] = [];
    m.onPushStateChange((s) => seen.push(s));

    await expect(m.initOneSignal()).resolves.toBe(false);
    expect(m.getPushState()).toBe('blocked');
    expect(seen).toEqual(['blocked']);

    // A second attempt would hang inside react-onesignal, so none is made.
    await expect(m.enablePush()).resolves.toBe('blocked');
    expect(fake.init).toHaveBeenCalledTimes(1);
  });

  it('reports blocked when the SDK never settles', async () => {
    fake.init.mockReturnValue(new Promise(() => {}));
    const m = await load();

    const result = m.initOneSignal();
    await untilInitCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe(false);
    expect(fake.init).toHaveBeenCalledTimes(1);
    expect(m.getPushState()).toBe('blocked');
  });

  it('adopts an SDK that loads after the timeout', async () => {
    const d = deferred();
    fake.init.mockReturnValue(d.promise);
    const m = await load();
    const seen: string[] = [];
    m.onPushStateChange((s) => seen.push(s));

    const result = m.initOneSignal();
    await untilInitCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe(false);
    expect(m.getPushState()).toBe('blocked');

    expect(fake.init).toHaveBeenCalledTimes(1);
    d.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(m.getPushState()).toBe('default');
    expect(seen).toEqual(['blocked', 'default']);
    await expect(m.initOneSignal()).resolves.toBe(true);
    expect(fake.Notifications.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('logs, and stays blocked, when the SDK fails after the timeout', async () => {
    const d = deferred();
    fake.init.mockReturnValue(d.promise);
    const m = await load();

    const result = m.initOneSignal();
    await untilInitCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(fake.init).toHaveBeenCalledTimes(1);

    d.reject(new Error('late failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(m.getPushState()).toBe('blocked');
    expect(console.warn).toHaveBeenCalledWith(
      '[onesignal] SDK also failed after the timeout:',
      expect.any(Error)
    );
  });
});

describe('getPushState', () => {
  it('prefers denied over blocked: the browser setting is fixed first', async () => {
    fake.init.mockRejectedValue(new Error('blocked'));
    const m = await load('denied');

    await m.initOneSignal();
    expect(m.getPushState()).toBe('denied');
  });

  it('is unsupported without the push APIs, whatever the SDK did', async () => {
    const m = await load();
    vi.stubGlobal('navigator', { userAgent: '' }); // no serviceWorker

    expect(m.getPushState()).toBe('unsupported');
    await expect(m.initOneSignal()).resolves.toBe(false);
    expect(fake.init).not.toHaveBeenCalled();
  });
});

/** Starts initOneSignal() with an SDK that misses the 10s timeout. Resolve the
    returned handle to make it arrive late. */
async function timedOut(m: Awaited<ReturnType<typeof load>>) {
  const d = deferred();
  fake.init.mockReturnValue(d.promise);
  const result = m.initOneSignal();
  await untilInitCalled();
  await vi.advanceTimersByTimeAsync(10_000);
  await expect(result).resolves.toBe(false);
  return d;
}

/** Lets the late adoption's promise chain and any queued microtasks run. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe('onSdkReady', () => {
  it('runs waiting callbacks once a late SDK is adopted', async () => {
    const m = await load();
    const d = await timedOut(m);
    const cb = vi.fn();
    m.onSdkReady(cb);

    await settle();
    expect(cb).not.toHaveBeenCalled();
    d.resolve();
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('never runs a callback that was unsubscribed first', async () => {
    const m = await load();
    const d = await timedOut(m);
    const cb = vi.fn();
    const stop = m.onSdkReady(cb);

    stop();
    d.resolve();
    await settle();
    expect(cb).not.toHaveBeenCalled();
  });

  it('runs on the next microtask when the SDK is already attached', async () => {
    fake.init.mockResolvedValue(undefined);
    const m = await load();
    await m.initOneSignal();
    const cb = vi.fn();

    m.onSdkReady(cb);
    expect(cb).not.toHaveBeenCalled();
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('clearPushAliasIfStale', () => {
  /** Starts the cleanup with an SDK that misses the timeout; resolve to deliver it. */
  async function staleClearTimedOut(m: Awaited<ReturnType<typeof load>>, signedOut: () => boolean) {
    localStorage.setItem('dw_push_aliased', '1');
    const d = deferred();
    fake.init.mockReturnValue(d.promise);
    const pending = m.clearPushAliasIfStale(async () => signedOut());
    await untilInitCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(fake.logout).not.toHaveBeenCalled();
    return d;
  }

  it('still clears a stale alias when the SDK arrives after the timeout', async () => {
    const m = await load();
    const d = await staleClearTimedOut(m, () => true);

    d.resolve();
    await settle();
    expect(fake.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('dw_push_aliased')).toBeNull();
  });

  it('leaves the alias alone if someone signed in before the SDK arrived', async () => {
    const m = await load();
    let signedOut = true;
    const d = await staleClearTimedOut(m, () => signedOut);

    // What WinsProvider does on sign-in: wait for the SDK, then log in.
    signedOut = false;
    m.onSdkReady(() => void m.loginPushAlias('new-alias'));
    d.resolve();
    await settle();

    expect(fake.logout).not.toHaveBeenCalled();
    expect(fake.login).toHaveBeenCalledWith('new-alias');
    expect(localStorage.getItem('dw_push_aliased')).toBe('1');
  });
});
