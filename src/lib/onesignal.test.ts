import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* The SDK wrapper keeps module-level state (sdk, initPromise, sdkBlocked), so
   every test re-imports it fresh. react-onesignal is replaced by a fake whose
   init() each test controls. That is enough to drive the whole load / block /
   late-adoption state machine without a browser. */

const fake = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
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
