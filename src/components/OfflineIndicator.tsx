import { useEffect, useState } from 'react';
import { useDW } from './dw/useDW';
import { Icon } from './dw/icons';

/* Connection and sync status, as a small pill above the tab bar (bottom of the
   canvas on desktop). Silent while online with nothing waiting to sync. The
   sync itself lives in WinsProvider (syncNow), so the online event and this
   button can never run two syncs at once. */
export function OfflineIndicator() {
  const { pendingCount, syncing, syncNow } = useDW();
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const changes = `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'}`;
  let message: string | null = null;
  if (!online) {
    message = pendingCount ? `You're offline. ${changes} will sync when you're back.` : "You're offline. You can keep logging wins.";
  } else if (pendingCount) {
    message = syncing ? `Syncing ${changes}…` : `${changes} waiting to sync`;
  }

  return (
    <div role="status" aria-live="polite">
      {message && (
        <div className="dw-status">
          <Icon name={online ? 'sync' : 'cloudOff'} size={16} />
          <span>{message}</span>
          {online && pendingCount > 0 && (
            <button type="button" className="dw-btn sm ghost" disabled={syncing} onClick={() => void syncNow()}>
              Sync now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
