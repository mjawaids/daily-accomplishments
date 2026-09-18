/* DailyWins — app state context, wired to Supabase + the IndexedDB offline layer.
   Replaces the prototype's localStorage store (app/store.jsx) with real data. */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../../lib/supabase';
import { offlineManager } from '../../lib/offline';
import { trackAccomplishmentEvent, trackConnectivityEvent } from '../../lib/analytics';
import { toWin } from '../../lib/winsData';
import type { Category, Win } from '../../lib/winsData';
import type { Database } from '../../lib/supabase';
import { ensureUserSettings, updateUserSettings } from '../../lib/userSettings';
import type { UserSettings, UserSettingsPatch } from '../../lib/userSettings';
import {
  disablePush,
  enablePush,
  getPushState,
  initOneSignal,
  loginPushAlias,
  onPushStateChange,
  resubscribeIfPermitted,
} from '../../lib/onesignal';
import type { PushState } from '../../lib/onesignal';
import { Icon } from './icons';
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

interface ToastState {
  msg: string;
  icon?: IconName;
  id: number;
}

export interface WinsContextValue {
  loading: boolean;
  entries: Win[];
  screen: Screen;
  setScreen: (s: Screen) => void;
  editing: Win | null;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  startEdit: (entry: Win) => void;
  openAdd: () => void;
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
  visibleDays: number;
  setVisibleDays: React.Dispatch<React.SetStateAction<number>>;
  toast: ToastState | null;
  showToast: (msg: string, icon?: IconName) => void;
  celebrate: number;
  addWin: (input: { text: string; category: Category; ts?: number }) => Promise<void>;
  updateWin: (id: string, patch: { text: string; category: Category; ts: number }) => Promise<void>;
  deleteWin: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  onSignOut: () => void;
  avatarUrl?: string;
  /** Server-side notification settings. Null while loading or if the row could
      not be read; the Notifications UI renders disabled in that case. */
  settings: UserSettings | null;
  settingsLoading: boolean;
  pushState: PushState;
  /** True while a permission prompt / opt-in round trip is in flight. */
  pushBusy: boolean;
  setPushEnabled: (on: boolean) => Promise<void>;
  updateSettings: (patch: UserSettingsPatch) => Promise<void>;
}

const WinsContext = createContext<WinsContextValue | null>(null);
export const useDW = (): WinsContextValue => {
  const ctx = useContext(WinsContext);
  if (!ctx) throw new Error('useDW must be used within WinsProvider');
  return ctx;
};

const PREFS_KEY = 'dw_prefs';

function loadPrefs(email: string, displayName?: string): Prefs {
  const fallback: Prefs = {
    name: displayName || (email ? email.split('@')[0] : 'there'),
    email,
    theme: 'light',
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
  const [entries, setEntries] = useState<Win[]>([]);
  const [screen, setScreenRaw] = useState<Screen>('timeline');
  const [editing, setEditing] = useState<Win | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleDays, setVisibleDays] = useState(6);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(userEmail, userName));
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pushState, setPushState] = useState<PushState>(() => getPushState());
  const [pushBusy, setPushBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota errors */
    }
  }, [prefs]);

  const showToast = useCallback((msg: string, icon?: IconName) => {
    setToast({ msg, icon, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const setScreen = useCallback((s: Screen) => {
    setScreenRaw(s);
    setSheetOpen(false);
    setEditing(null);
  }, []);

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
          await offlineManager.cacheAccomplishments(rows);
          return;
        } catch (err) {
          console.error('Error loading from Supabase, falling back to cache:', err);
        }
      }
      // Offline (or failed) → read from the IndexedDB cache.
      const cached = await offlineManager.getCachedAccomplishments(user.id, 1, 100000);
      setEntries(cached.data.map(toWin));
    } catch (err) {
      console.error('Error loading accomplishments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    offlineManager.init();
    loadEntries();
  }, [loadEntries]);

  // Online/offline handling + background sync.
  useEffect(() => {
    const handleOnline = async () => {
      trackConnectivityEvent('online');
      // Fire a 'sync' event only when there were offline changes to flush.
      let hadPending = false;
      try {
        hadPending = (await offlineManager.getSyncStatus()).pendingCount > 0;
      } catch {
        /* ignore */
      }
      await offlineManager.syncPendingOperations();
      if (hadPending) trackConnectivityEvent('sync');
      loadEntries();
    };
    const handleOffline = () => trackConnectivityEvent('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadEntries]);

  // ---- notification settings ----------------------------------------------
  // Loads (creating on first run) the server-side settings row, keeps the stored
  // IANA timezone in step with this device, and reconciles the stored
  // push_enabled flag against what the browser actually believes.
  useEffect(() => {
    let cancelled = false;
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
        const ready = await initOneSignal();
        if (ready && !cancelled) {
          await loginPushAlias(current.push_alias);
          // push_enabled is account-wide (one user_settings row per user) while
          // subscription state is per-browser, so this must NOT write the flag
          // from what this device happens to believe: a second device that never
          // opted in would switch reminders off for the phone that did.
          // Instead, let this device join when it already has permission.
          await resubscribeIfPermitted();
        }
      }
      if (!cancelled) setPushState(getPushState());
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => onPushStateChange(setPushState), []);

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
    setSheetOpen(true);
  }, []);

  const addWin = useCallback(
    async ({ text, category, ts }: { text: string; category: Category; ts?: number }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const createdAt = ts ? new Date(ts).toISOString() : undefined;
      const saved = await offlineManager.addAccomplishment({
        text: text.trim(),
        category,
        user_id: user.id,
        ...(createdAt ? { created_at: createdAt } : {}),
      });
      setEntries((prev) => [toWin(saved), ...prev].sort((a, b) => b.ts - a.ts));
      setCelebrate((c) => c + 1);
      showToast('Win logged — nice work!', 'check');
      trackAccomplishmentEvent('add', category);
    },
    [showToast]
  );

  const updateWin = useCallback(
    async (id: string, patch: { text: string; category: Category; ts: number }) => {
      const text = patch.text.trim();
      const createdAt = new Date(patch.ts).toISOString();
      if (navigator.onLine) {
        const { error } = await supabase
          .from('accomplishments')
          .update({ text, category: patch.category, created_at: createdAt, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) {
          console.error('Error updating accomplishment:', error);
          return;
        }
      } else {
        // Offline best-effort: text + date sync via the pending queue (category
        // updates optimistically in local state only).
        await offlineManager.updateAccomplishment(id, text, createdAt);
      }
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, text, category: patch.category, ts: patch.ts } : e))
          .sort((a, b) => b.ts - a.ts)
      );
      showToast('Entry updated', 'check');
      trackAccomplishmentEvent('edit', patch.category);
    },
    [showToast]
  );

  const deleteWin = useCallback(
    async (id: string) => {
      const removed = entries.find((e) => e.id === id);
      await offlineManager.deleteAccomplishment(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showToast('Entry deleted', 'trash');
      if (removed) trackAccomplishmentEvent('delete', removed.category);
    },
    [entries, showToast]
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
    showToast('All entries cleared', 'trash');
  }, [entries, showToast]);

  const value: WinsContextValue = {
    loading,
    entries,
    screen,
    setScreen,
    editing,
    sheetOpen,
    setSheetOpen,
    startEdit,
    openAdd,
    prefs,
    setPrefs,
    visibleDays,
    setVisibleDays,
    toast,
    showToast,
    celebrate,
    addWin,
    updateWin,
    deleteWin,
    clearAll,
    onSignOut,
    avatarUrl,
    settings,
    settingsLoading,
    pushState,
    pushBusy,
    setPushEnabled,
    updateSettings,
  };

  return <WinsContext.Provider value={value}>{children}</WinsContext.Provider>;
}

// ---- Toast ----
export function Toast() {
  const { toast } = useDW();
  if (!toast) return null;
  return (
    <div className="dw-toast" key={toast.id}>
      <Icon name={toast.icon || 'check'} size={17} sw={2.4} />
      <span>{toast.msg}</span>
    </div>
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
