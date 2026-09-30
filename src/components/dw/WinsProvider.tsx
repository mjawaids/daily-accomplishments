/* DailyWins — app state context, wired to Supabase + the IndexedDB offline layer.
   Replaces the prototype's localStorage store (app/store.jsx) with real data. */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { offlineManager } from '../../lib/offline';
import { trackAccomplishmentEvent, trackConnectivityEvent } from '../../lib/analytics';
import { stripTourParam, wantsTour } from '../../lib/onboarding';
import { toWin } from '../../lib/winsData';
import type { Win } from '../../lib/winsData';
import {
  DEFAULT_CATEGORIES,
  MAX_CATEGORIES,
  analyticsLabel,
  categoryWriteFields,
  createCategory,
  deleteCategory,
  ensureCategories,
  readCachedCategories,
  resolveCategory,
  sortCategories,
  updateCategory,
  writeCachedCategories,
} from '../../lib/categories';
import type { Category, CategoryInput } from '../../lib/categories';
import type { Database } from '../../lib/supabase';
import {
  ensureUserSettings,
  loadPushUnreachable,
  markPushReachable,
  updateUserSettings,
} from '../../lib/userSettings';
import type { UserSettings, UserSettingsPatch } from '../../lib/userSettings';
import {
  disablePush,
  enablePush,
  getPushState,
  initOneSignal,
  loginPushAlias,
  onPushStateChange,
  onSdkReady,
  resubscribeIfPermitted,
} from '../../lib/onesignal';
import type { PushState } from '../../lib/onesignal';
import { Icon } from './icons';
import { WinsContext, useDW } from './useDW';
import type { IconName } from './icons';

type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];

export type Screen = 'timeline' | 'insights' | 'profile';
export type Theme = 'light' | 'dark' | 'sync';

/* Device-scoped preferences, kept in the `dw_prefs` localStorage blob.
   Notification settings deliberately do NOT live here: the reminder sender has
   to read them server-side, so they live in the user_settings table instead
   (see src/lib/userSettings.ts). */
export interface Prefs {
  name: string;
  email: string;
  theme: Theme;
}

/** Which category the editor sheet is open on, if any. */
export type CategorySheetState = { mode: 'add' } | { mode: 'edit'; id: string } | null;

interface ToastState {
  msg: string;
  icon?: IconName;
  id: number;
  /** Errors are announced assertively (role="alert"). */
  tone?: 'info' | 'error';
}

export interface WinsContextValue {
  loading: boolean;
  /** True when the last attempt to load wins from the server failed (the
      entries shown, if any, are this device's cached copy). */
  loadError: boolean;
  retryLoad: () => void;
  /** Changes saved on this device that haven't reached the server yet. */
  pendingCount: number;
  /** True while pending changes are being sent. */
  syncing: boolean;
  syncNow: () => Promise<void>;
  entries: Win[];
  screen: Screen;
  setScreen: (s: Screen) => void;
  editing: Win | null;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  startEdit: (entry: Win) => void;
  openAdd: () => void;
  /** Opens the add sheet with its date pre-set to `day` (`YYYY-MM-DD`). */
  openAddForDay: (day: string) => void;
  /** The day the add sheet opens on, when it was opened with openAddForDay(). */
  addDay: string | null;
  /** The day the Timeline is filtered to (`YYYY-MM-DD`), or null for all days. */
  timelineDay: string | null;
  setTimelineDay: (day: string | null) => void;
  /** Switches to the Timeline, filtered to `day`. */
  jumpToDay: (day: string) => void;
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
  visibleDays: number;
  setVisibleDays: React.Dispatch<React.SetStateAction<number>>;
  toast: ToastState | null;
  showToast: (msg: string, icon?: IconName, tone?: 'info' | 'error') => void;
  celebrate: number;
  addWin: (input: { text: string; categoryId: string; ts?: number }) => Promise<void>;
  updateWin: (id: string, patch: { text: string; categoryId: string; ts: number }) => Promise<void>;
  /** The user's categories, in display order. Falls back to the defaults until
      the real rows load (or while they cannot be reached). */
  categories: Category[];
  /** False while `categories` are the placeholder defaults, so they cannot be
      edited yet. */
  categoriesReady: boolean;
  catById: (id: string) => Category;
  categorySheet: CategorySheetState;
  setCategorySheet: (s: CategorySheetState) => void;
  addCategory: (input: CategoryInput) => Promise<boolean>;
  editCategory: (id: string, input: CategoryInput) => Promise<boolean>;
  /** Moves the category's wins into `moveTo`, then deletes it. */
  removeCategory: (id: string, moveTo: string) => Promise<boolean>;
  deleteWin: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  onSignOut: () => void;
  avatarUrl?: string;
  /** Server-side notification settings. Null while loading or if the row could
      not be read; the Notifications UI renders disabled in that case. */
  settings: UserSettings | null;
  settingsLoading: boolean;
  pushState: PushState;
  /** True when OneSignal has told the sender that no device on this account can
      receive a push, so reminders are paused even though push_enabled is on. */
  pushUnreachable: boolean;
  /** True while a permission prompt / opt-in round trip is in flight. */
  pushBusy: boolean;
  setPushEnabled: (on: boolean) => Promise<void>;
  updateSettings: (patch: UserSettingsPatch) => Promise<void>;
  /** True while the replayable intro tour is shown over the app. */
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
}

const PREFS_KEY = 'dw_prefs';

function loadPrefs(email: string, displayName?: string): Prefs {
  const fallback: Prefs = {
    name: displayName || (email ? email.split('@')[0] : 'there'),
    email,
    // Follow the device until the person picks Light or Dark in Profile.
    theme: 'sync',
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...fallback, ...parsed, email: email || parsed.email || fallback.email };
  } catch {
    return fallback;
  }
}

interface WinsProviderProps {
  userId: string;
  userEmail: string;
  userName?: string;
  avatarUrl?: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function WinsProvider({ userId, userEmail, userName, avatarUrl, onSignOut, children }: WinsProviderProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [entries, setEntries] = useState<Win[]>([]);
  const [screen, setScreenRaw] = useState<Screen>('timeline');
  const [editing, setEditing] = useState<Win | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDay, setAddDay] = useState<string | null>(null);
  const [timelineDay, setTimelineDay] = useState<string | null>(null);
  const [visibleDays, setVisibleDays] = useState(6);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(userEmail, userName));
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pushState, setPushState] = useState<PushState>(() => getPushState());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushUnreachable, setPushUnreachable] = useState(false);
  const [cachedCategories] = useState(() => readCachedCategories(userId));
  const [categories, setCategoriesRaw] = useState<Category[]>(() => cachedCategories || DEFAULT_CATEGORIES);
  const [categoriesReady, setCategoriesReady] = useState(!!cachedCategories);
  const [categorySheet, setCategorySheet] = useState<CategorySheetState>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota errors */
    }
  }, [prefs]);

  const showToast = useCallback((msg: string, icon?: IconName, tone: 'info' | 'error' = 'info') => {
    setToast({ msg, icon, id: Date.now(), tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    // Longer messages (errors, "saved on this device") need longer to read.
    toastTimer.current = setTimeout(() => setToast(null), msg.length > 40 ? 5000 : 2400);
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      setPendingCount((await offlineManager.getSyncStatus()).pendingCount);
    } catch {
      /* IndexedDB unavailable: nothing can be pending */
    }
  }, []);

  useEffect(() => {
    refreshPending();
    const t = setInterval(refreshPending, 5000);
    return () => clearInterval(t);
  }, [refreshPending]);

  /** Confirms a write, or says it didn't reach the server and was queued. */
  const confirmWrite = useCallback(
    (synced: boolean, done: string, icon: IconName) => {
      if (synced) {
        showToast(done, icon);
      } else {
        showToast(
          navigator.onLine
            ? "Couldn't reach the server. Saved on this device and will sync later."
            : "You're offline. Saved on this device and will sync when you're back.",
          'sync'
        );
      }
      refreshPending();
    },
    [showToast, refreshPending]
  );

  const setScreen = useCallback((s: Screen) => {
    setScreenRaw(s);
    setSheetOpen(false);
    setEditing(null);
    setCategorySheet(null);
  }, []);

  const openTour = useCallback(() => {
    setSheetOpen(false);
    setCategorySheet(null);
    setTourOpen(true);
  }, []);
  const closeTour = useCallback(() => setTourOpen(false), []);

  // ?tour=1 deep link (support replies, release notes): open the tour, then
  // drop the param so a reload or Back doesn't reopen it. It survives the auth
  // screen, so it also works for someone who has to sign in first.
  useEffect(() => {
    if (!wantsTour(location.search)) return;
    openTour();
    navigate({ pathname: location.pathname, search: stripTourParam(location.search), hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate, openTour]);

  const setCategories = useCallback(
    (next: Category[]) => {
      const sorted = sortCategories(next);
      setCategoriesRaw(sorted);
      setCategoriesReady(true);
      writeCachedCategories(userId, sorted);
    },
    [userId]
  );

  // Categories: seeded with the defaults on first run (see ensureCategories).
  const loadCategories = useCallback(async () => {
    if (!navigator.onLine) return;
    const loaded = await ensureCategories(userId);
    if (loaded && loaded.length) setCategories(loaded);
  }, [userId, setCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const catById = useCallback((id: string) => resolveCategory(categories, id), [categories]);

  // Load the user's full win history (used by both Timeline and Insights).
  const loadEntries = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('accomplishments')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          const rows = (data || []) as Accomplishment[];
          setEntries(rows.map(toWin));
          setLoadError(false);
          await offlineManager.cacheAccomplishments(rows);
          return;
        } catch (err) {
          console.error('Error loading from Supabase, falling back to cache:', err);
          setLoadError(true);
        }
      }
      // Offline (or failed) → read from the IndexedDB cache.
      const cached = await offlineManager.getCachedAccomplishments(user.id, 1, 100000);
      setEntries(cached.data.map(toWin));
    } catch (err) {
      console.error('Error loading accomplishments:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLoad = useCallback(() => {
    loadCategories();
    loadEntries();
  }, [loadCategories, loadEntries]);

  /** Sends queued changes, then reloads. Only one sync runs at a time, so the
      online event and the Sync now button can't insert the same win twice. */
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      let hadPending = false;
      try {
        hadPending = (await offlineManager.getSyncStatus()).pendingCount > 0;
      } catch {
        /* ignore */
      }
      await offlineManager.syncPendingOperations();
      if (hadPending) trackConnectivityEvent('sync');
      loadCategories();
      await loadEntries();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      refreshPending();
    }
  }, [loadCategories, loadEntries, refreshPending]);

  useEffect(() => {
    offlineManager.init();
    loadEntries();
  }, [loadEntries]);

  // Online/offline handling + background sync.
  useEffect(() => {
    const handleOnline = () => {
      trackConnectivityEvent('online');
      void syncNow();
    };
    const handleOffline = () => trackConnectivityEvent('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // ---- notification settings ----------------------------------------------
  // Loads (creating on first run) the server-side settings row, keeps the stored
  // IANA timezone in step with this device, and reconciles the stored
  // push_enabled flag against what the browser actually believes.
  useEffect(() => {
    let cancelled = false;
    let stopWaitingForSdk: (() => void) | undefined;
    (async () => {
      const loaded = await ensureUserSettings(userId);
      if (cancelled) return;
      if (!loaded) {
        setSettingsLoading(false);
        return;
      }

      // NB: the detected zone is deliberately NOT written back here. timezone is
      // account-wide and the sender applies it to every device, so auto-adopting
      // whatever this browser reports lets one machine silently reschedule
      // everything — open the app on a laptop left on America/New_York and a
      // Europe/Berlin user's 20:00 reminder moves to 02:00 on all their devices.
      // It is seeded once in ensureUserSettings() and changed only when the user
      // says so, from the Profile screen.
      const current = loaded;
      if (cancelled) return;
      setSettings(current);
      setSettingsLoading(false);

      if (current.push_enabled) {
        const joinThisDevice = async () => {
          await loginPushAlias(current.push_alias);
          // push_enabled is account-wide (one user_settings row per user) while
          // subscription state is per-browser, so this must NOT write the flag
          // from what this device happens to believe: a second device that never
          // opted in would switch reminders off for the phone that did.
          // Instead, let this device join when it already has permission.
          await resubscribeIfPermitted();
        };
        const ready = await initOneSignal();
        if (cancelled) return;
        if (ready) {
          await joinThisDevice();
        } else {
          // Init gives up after a timeout, but on a slow network the SDK can
          // still arrive later. Join then, instead of leaving this device
          // unsubscribed until a reload. Unsubscribed in cleanup, so a sign-out
          // in the meantime can never re-alias this browser.
          stopWaitingForSdk = onSdkReady(() => {
            if (!cancelled) void joinThisDevice();
          });
        }
      }
      if (!cancelled) setPushState(getPushState());
    })();
    return () => {
      cancelled = true;
      stopWaitingForSdk?.();
    };
  }, [userId]);

  useEffect(() => onPushStateChange(setPushState), []);

  // The sender pauses an account once OneSignal reports no live subscription
  // for it (push_unreachable_since). push_enabled is left on, so the silent
  // resubscribe above still runs — and the moment THIS browser is subscribed,
  // the account is reachable again. This only ever clears the mark: a browser
  // that is not subscribed proves nothing about the account's other devices.
  useEffect(() => {
    if (!settings?.push_enabled) return;
    let cancelled = false;
    (async () => {
      const unreachable = await loadPushUnreachable(userId);
      if (cancelled || unreachable === null) return;
      if (unreachable && pushState === 'granted-on') {
        const cleared = await markPushReachable();
        if (!cancelled) setPushUnreachable(!cleared);
        return;
      }
      setPushUnreachable(unreachable);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, settings?.push_enabled, pushState]);

  const updateSettings = useCallback(
    async (patch: UserSettingsPatch) => {
      const next = await updateUserSettings(userId, patch);
      if (next) setSettings(next);
    },
    [userId]
  );

  const setPushEnabled = useCallback(
    async (on: boolean) => {
      if (!settings || pushBusy) return;
      setPushBusy(true);
      try {
        if (on) {
          const state = await enablePush();
          setPushState(state);
          if (state === 'granted-on') {
            await loginPushAlias(settings.push_alias);
            const next = await updateUserSettings(userId, { push_enabled: true });
            if (next) setSettings(next);
            showToast('Reminders on', 'bell');
          } else if (state === 'denied') {
            showToast('Notifications are blocked in your browser settings', 'bell');
          } else if (state === 'blocked') {
            showToast('Blocked by an ad blocker — allow this site, then reload', 'bell');
          }
        } else {
          await disablePush();
          setPushState(getPushState());
          const next = await updateUserSettings(userId, { push_enabled: false });
          if (next) setSettings(next);
          showToast('Reminders off', 'bell');
        }
      } finally {
        setPushBusy(false);
      }
    },
    [settings, pushBusy, userId, showToast]
  );

  const startEdit = useCallback((entry: Win) => {
    setEditing(entry);
    setSheetOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setAddDay(null);
    setSheetOpen(true);
  }, []);

  const openAddForDay = useCallback((day: string) => {
    setEditing(null);
    setAddDay(day);
    setSheetOpen(true);
  }, []);

  const jumpToDay = useCallback(
    (day: string) => {
      setScreen('timeline');
      setTimelineDay(day);
    },
    [setScreen]
  );

  const addWin = useCallback(
    async ({ text, categoryId, ts }: { text: string; categoryId: string; ts?: number }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const createdAt = ts ? new Date(ts).toISOString() : undefined;
      let saved: Accomplishment;
      try {
        saved = await offlineManager.addAccomplishment({
          text: text.trim(),
          ...categoryWriteFields(categoryId),
          user_id: user.id,
          ...(createdAt ? { created_at: createdAt } : {}),
        });
      } catch (err) {
        // Not even the on-device queue took it (storage full or blocked).
        console.error('Error saving win:', err);
        showToast("Couldn't save your win. Please try again.", 'flag', 'error');
        return;
      }
      setEntries((prev) => [toWin(saved), ...prev].sort((a, b) => b.ts - a.ts));
      // A queued win comes back as the pending row, marked synced: false.
      const synced = (saved as { synced?: boolean }).synced !== false;
      if (synced) setCelebrate((c) => c + 1);
      confirmWrite(synced, 'Win logged — nice work!', 'check');
      trackAccomplishmentEvent('add', analyticsLabel(resolveCategory(categories, categoryId)));
    },
    [confirmWrite, showToast, categories]
  );

  const updateWin = useCallback(
    async (id: string, patch: { text: string; categoryId: string; ts: number }) => {
      const text = patch.text.trim();
      const createdAt = new Date(patch.ts).toISOString();
      // Online: writes to Supabase. Offline, or if that fails: queues the edit
      // (text, date and category) for sync. Either way the IndexedDB cache is
      // updated, so the edit survives a reload while offline.
      let synced: boolean;
      try {
        synced = await offlineManager.updateAccomplishment(id, text, createdAt, categoryWriteFields(patch.categoryId));
      } catch (err) {
        console.error('Error saving edit:', err);
        showToast("Couldn't save your changes. Please try again.", 'flag', 'error');
        return;
      }
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, text, categoryId: patch.categoryId, ts: patch.ts } : e))
          .sort((a, b) => b.ts - a.ts)
      );
      confirmWrite(synced, 'Win updated', 'check');
      trackAccomplishmentEvent('edit', analyticsLabel(resolveCategory(categories, patch.categoryId)));
    },
    [confirmWrite, showToast, categories]
  );

  const deleteWin = useCallback(
    async (id: string) => {
      const removed = entries.find((e) => e.id === id);
      let synced: boolean;
      try {
        synced = await offlineManager.deleteAccomplishment(id);
      } catch (err) {
        console.error('Error deleting win:', err);
        showToast("Couldn't delete the win. Please try again.", 'flag', 'error');
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      confirmWrite(synced, 'Win deleted', 'trash');
      if (removed) trackAccomplishmentEvent('delete', analyticsLabel(resolveCategory(categories, removed.categoryId)));
    },
    [entries, confirmWrite, showToast, categories]
  );

  const clearAll = useCallback(async () => {
    for (const e of entries) {
      try {
        await offlineManager.deleteAccomplishment(e.id);
      } catch (err) {
        console.error('Error clearing entry:', err);
      }
    }
    setEntries([]);
    showToast('All wins deleted', 'trash');
    refreshPending();
  }, [entries, showToast, refreshPending]);

  // ---- category management (online only: the offline queue covers wins, not
  // categories) ----------------------------------------------------------------
  const canManageCategories = useCallback((): boolean => {
    if (!navigator.onLine) {
      showToast("You're offline — categories can be changed once you reconnect", 'sync');
      return false;
    }
    if (!categoriesReady) {
      showToast('Categories are still loading — try again in a moment', 'sync');
      loadCategories();
      return false;
    }
    return true;
  }, [categoriesReady, loadCategories, showToast]);

  const addCategory = useCallback(
    async (input: CategoryInput) => {
      if (!canManageCategories()) return false;
      if (categories.length >= MAX_CATEGORIES) {
        showToast(`You can have up to ${MAX_CATEGORIES} categories`, 'flag');
        return false;
      }
      const position = Math.max(-1, ...categories.map((c) => c.position)) + 1;
      const created = await createCategory(userId, input, position);
      if (!created) {
        showToast("Couldn't add the category — please try again", 'flag');
        return false;
      }
      setCategories([...categories, created]);
      showToast('Category added', 'check');
      return true;
    },
    [canManageCategories, categories, setCategories, showToast, userId]
  );

  const editCategory = useCallback(
    async (id: string, input: CategoryInput) => {
      if (!canManageCategories()) return false;
      const updated = await updateCategory(id, input);
      if (!updated) {
        showToast("Couldn't save the category — please try again", 'flag');
        return false;
      }
      setCategories(categories.map((c) => (c.id === id ? updated : c)));
      showToast('Category updated', 'check');
      return true;
    },
    [canManageCategories, categories, setCategories, showToast]
  );

  const removeCategory = useCallback(
    async (id: string, moveTo: string) => {
      if (!canManageCategories()) return false;
      const ok = await deleteCategory(id, moveTo);
      if (!ok) {
        showToast("Couldn't delete the category — please try again", 'flag');
        return false;
      }
      setCategories(categories.filter((c) => c.id !== id));
      setEntries((prev) =>
        prev.map((e) => (resolveCategory(categories, e.categoryId).id === id ? { ...e, categoryId: moveTo } : e))
      );
      showToast('Category deleted', 'trash');
      // Refresh so the IndexedDB cache stops holding the deleted category id.
      loadEntries();
      return true;
    },
    [canManageCategories, categories, setCategories, showToast, loadEntries]
  );

  const value: WinsContextValue = {
    loading,
    loadError,
    retryLoad,
    pendingCount,
    syncing,
    syncNow,
    entries,
    screen,
    setScreen,
    editing,
    sheetOpen,
    setSheetOpen,
    startEdit,
    openAdd,
    openAddForDay,
    addDay,
    timelineDay,
    setTimelineDay,
    jumpToDay,
    prefs,
    setPrefs,
    visibleDays,
    setVisibleDays,
    toast,
    showToast,
    celebrate,
    addWin,
    updateWin,
    categories,
    categoriesReady,
    catById,
    categorySheet,
    setCategorySheet,
    addCategory,
    editCategory,
    removeCategory,
    deleteWin,
    clearAll,
    onSignOut,
    avatarUrl,
    settings,
    settingsLoading,
    pushState,
    pushUnreachable,
    pushBusy,
    setPushEnabled,
    updateSettings,
    tourOpen,
    openTour,
    closeTour,
  };

  return <WinsContext.Provider value={value}>{children}</WinsContext.Provider>;
}

// ---- Toast ----
export function Toast() {
  const { toast } = useDW();
  // Both live regions stay mounted, so screen readers announce each new message.
  const error = toast?.tone === 'error';
  const body = toast && (
    <div className="dw-toast" key={toast.id}>
      <Icon name={toast.icon || 'check'} size={17} sw={2.4} />
      <span>{toast.msg}</span>
    </div>
  );
  return (
    <>
      <div role="status" aria-atomic="true">
        {!error && body}
      </div>
      <div role="alert" aria-atomic="true">
        {error && body}
      </div>
    </>
  );
}

// ---- Confetti burst (fires on celebrate change) ----
interface ConfettiPiece {
  id: string;
  dx: number;
  dy: number;
  dr: string;
  c: string;
  left: number;
  round: boolean;
}

export function Confetti() {
  const { celebrate } = useDW();
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const cols = ['var(--accent)', 'var(--accent-2)', 'var(--cat-work)', 'var(--cat-health)', 'var(--cat-learning)'];
    const next: ConfettiPiece[] = Array.from({ length: 16 }, (_, i) => {
      const ang = Math.PI * (0.15 + Math.random() * 0.7) * -1;
      const dist = 60 + Math.random() * 80;
      return {
        id: celebrate + '-' + i,
        dx: Math.cos(ang) * dist * (Math.random() < 0.5 ? -1 : 1),
        dy: -Math.abs(Math.sin(ang) * dist) - 20,
        dr: Math.random() * 720 - 360 + 'deg',
        c: cols[i % cols.length],
        left: 46 + Math.random() * 8,
        round: Math.random() < 0.5,
      };
    });
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 1000);
    return () => clearTimeout(t);
  }, [celebrate]);
  if (!pieces.length) return null;
  return (
    <div className="dw-burst" style={{ left: 0, right: 0, top: '38%', height: 0 }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="dw-confetti"
          style={
            {
              left: p.left + '%',
              background: p.c,
              borderRadius: p.round ? '50%' : '2px',
              '--dx': p.dx + 'px',
              '--dy': p.dy + 'px',
              '--dr': p.dr,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
