import { useEffect, useState } from 'react';
import { useDW } from './useDW';
import { isIosNeedsInstall } from '../../lib/onesignal';
import { formatReminderTime } from '../../lib/userSettings';
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
    // Only when this browser has never been asked. That covers both a new user
    // and someone who already enabled reminders on another device -- the second
    // device still needs its own permission, and push_enabled being true
    // account-wide does not mean this browser is subscribed.
    // 'denied' cannot be re-prompted, 'granted-off' means they deliberately
    // turned it off, and iOS needs a Home Screen install before push works.
    pushState === 'default' &&
    !isIosNeedsInstall();

  if (!eligible) return null;

  // Reads differently depending on whether this is a first-time opt-in or an
  // additional device joining an account that already wants reminders.
  const alreadyOnElsewhere = settings.push_enabled;

  // Shares the prompt slot with InstallPrompt; while that one shows, this one
  // waits (see .dw-prompt--push in dailywins.css).
  return (
    <section className="dw-prompt dw-prompt--push" aria-labelledby="dw-push-title">
      <div className="card">
        <div className="ico">
          <Icon name="bell" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="t" id="dw-push-title">
            {alreadyOnElsewhere ? 'Add reminders on this device' : 'Want an evening nudge?'}
          </h2>
          <div className="s">
            {alreadyOnElsewhere
              ? 'Your reminders are on, but this device is not set up to receive them yet.'
              : `You'll get a reminder at ${formatReminderTime(settings.reminder_local_time)} to log a win. Change the time or turn it off any time in Profile.`}
          </div>
          <div className="acts">
            <button className="dw-btn sm" disabled={pushBusy} onClick={() => setPushEnabled(true)}>
              <Icon name="bell" size={15} sw={2.2} />
              {pushBusy ? 'Enabling…' : alreadyOnElsewhere ? 'Enable here' : 'Remind me'}
            </button>
            <button className="dw-btn ghost sm" onClick={handleDismiss}>
              Not now
            </button>
          </div>
        </div>
        <button className="dw-iconbtn" onClick={handleDismiss} aria-label="Dismiss reminder prompt" title="Dismiss">
          <Icon name="x" size={16} />
        </button>
      </div>
    </section>
  );
}
