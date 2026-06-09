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
import { Icon } from './icons';
import type { IconName } from './icons';

type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];

export type Screen = 'timeline' | 'insights' | 'profile';
export type Theme = 'light' | 'dark' | 'sync';

export interface Prefs {
  name: string;
  email: string;
  theme: Theme;
  notifications: boolean;
  eveningReminder: boolean;
  weekdigest: boolean;
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
}

const WinsContext = createContext<WinsContextValue | null>(null);
export const useDW = (): WinsContextValue => {
  const ctx = useContext(WinsContext);
  if (!ctx) throw new Error('useDW must be used within WinsProvider');
  return ctx;
};

const PREFS_KEY = 'dw_prefs';

function loadPrefs(email: string): Prefs {
  const fallback: Prefs = {
    name: email ? email.split('@')[0] : 'there',
    email,
    theme: 'light',
    notifications: true,
    eveningReminder: true,
    weekdigest: false,
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
  userEmail: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function WinsProvider({ userEmail, onSignOut, children }: WinsProviderProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Win[]>([]);
  const [screen, setScreenRaw] = useState<Screen>('timeline');
  const [editing, setEditing] = useState<Win | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleDays, setVisibleDays] = useState(6);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(userEmail));
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
