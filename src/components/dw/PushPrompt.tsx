import { useEffect, useState } from 'react';
import { useDW } from './WinsProvider';
import { isIosNeedsInstall } from '../../lib/onesignal';
import { Icon } from './icons';

/* Asks existing users, once per device, whether they want the evening reminder.

   The Profile toggle alone has almost no reach, but a cold native permission
   prompt converts badly and a denied permission is permanent -- so explain the
   value first and only then hand over to the browser.

   Dismissal is stored in localStorage rather than user_settings on purpose: the
   browser permission this gates is itself per-device, so "not now" should mean
   "not on this device". The Profile toggle stays available either way. */
const DISMISSED_KEY = 'dw_push_prompt_dismissed';

export function PushPrompt() {
  const { settings, settingsLoading, pushState, pushBusy, setPushEnabled } = useDW();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [ready, setReady] = useState(false);

  // Don't ambush someone who just opened the app to log a win.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* private mode — it will ask again next visit, which is acceptable */
    }
  };

  const eligible =
    ready &&
    !dismissed &&
    !settingsLoading &&
    !!settings &&
    !settings.push_enabled &&
    // Only when the browser has never been asked. 'denied' cannot be re-prompted,
    // 'granted-off' means they deliberately turned it off, and iOS needs the app
    // installed to the Home Screen before push works at all.
    pushState === 'default' &&
    !isIosNeedsInstall();

  if (!eligible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        // Sits one card above InstallPrompt's slot so the two never overlap.
        bottom: 'calc(168px + env(safe-area-inset-bottom))',
        maxWidth: 380,
        marginLeft: 'auto',
        zIndex: 70,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: '14px 16px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
        >
          <Icon name="bell" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Want an evening nudge?</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '2px 0 10px' }}>
            We'll remind you at 8:00 PM to log a win. Change the time or turn it off any time in
            Profile.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="dw-btn sm" disabled={pushBusy} onClick={() => setPushEnabled(true)}>
              <Icon name="bell" size={15} sw={2.2} />
              {pushBusy ? 'Enabling…' : 'Remind me'}
            </button>
            <button className="dw-btn ghost sm" onClick={handleDismiss}>
              Not now
            </button>
          </div>
        </div>
        <button
          className="dw-iconbtn"
          style={{ width: 30, height: 30, boxShadow: 'none', background: 'transparent' }}
          onClick={handleDismiss}
          title="Dismiss"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
