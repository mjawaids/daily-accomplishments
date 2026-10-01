/* DailyWins — Profile + Empty screens (rendered inside the app shell).
   Ported from the Claude Design handoff (app/screens2.jsx). Accent picker and
   "restore sample data" are dropped per the agreed scope (defaults only). */
import { useId, useState } from 'react';
import { LoadErrorBanner, Sheet } from './components';
import { useDW } from './useDW';
import type { Theme } from './WinsProvider';
import type { Device } from './useDevice';
import { Icon, CatGlyph } from './icons';
import { computeStreak } from '../../lib/winsData';
import { MAX_CATEGORIES } from '../../lib/categories';
import { browserTimezone, formatReminderTime, roundToQuarterHour, toInputTime } from '../../lib/userSettings';
import { isIosNeedsInstall } from '../../lib/onesignal';
import { IBEXOFT_CONTACT_PATH, ibexoftUrl, jawaidUrl } from '../../lib/links';

interface ToggleRowProps {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  sub?: string;
  on: boolean;
  onToggle: () => void;
  /** Renders the row inert — e.g. push unsupported, or blocked by the browser. */
  disabled?: boolean;
  /** A permission prompt / opt-in round trip is in flight. */
  busy?: boolean;
}

function ToggleRow({ icon, title, sub, on, onToggle, disabled, busy }: ToggleRowProps) {
  const id = useId();
  // Only the switch dims when it can't be used; the label and the reason
  // under it stay readable.
  return (
    <div className="dw-prefrow">
      <div className="ico">
        <Icon name={icon} size={18} />
      </div>
      <div className="lbl">
        <div className="t" id={`${id}-t`}>
          {title}
        </div>
        {sub && (
          <div className="s" id={`${id}-s`}>
            {sub}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-t`}
        aria-describedby={sub ? `${id}-s` : undefined}
        aria-busy={busy || undefined}
        className={'dw-toggle' + (on ? ' on' : '')}
        onClick={onToggle}
        disabled={disabled || busy}
      >
        <span className="knob" />
      </button>
    </div>
  );
}

/** Asks before deleting every win. */
function ClearAllSheet({ count, onConfirm, onClose }: { count: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet labelledBy="dw-clear-title" onClose={onClose}>
      <h3 id="dw-clear-title">{count === 1 ? 'Delete your 1 win?' : `Delete all ${count} wins?`}</h3>
      <p className="dw-danger-note">Every win in every category will be deleted. This can’t be undone.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button className="dw-btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="dw-btn block danger" onClick={onConfirm}>
          <Icon name="trash" size={17} />
          Delete all wins
        </button>
      </div>
    </Sheet>
  );
}

export function Profile({ device }: { device: Device }) {
  const {
    prefs,
    setPrefs,
    setScreen,
    entries,
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
    categories,
    catById,
    setCategorySheet,
    openTour,
    loadError,
  } = useDW();
  const [confirmClear, setConfirmClear] = useState(false);
  const atCategoryLimit = categories.length >= MAX_CATEGORIES;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(prefs.name);

  // Only the display name is editable: the email is the sign-in address and
  // can't be changed from here.
  const saveProfile = () => {
    setPrefs((p) => ({ ...p, name: name.trim() || p.name }));
    setEditing(false);
  };

  /* Two different things are in play here and the UI has to keep them apart:
     push_enabled is account-wide (one user_settings row per user, and it is what
     the sender gates on), while permission and subscription are per-browser. The
     toggle shows the account setting; the sub-line says whether THIS browser is
     actually going to receive anything. */
  const pushOn = !!settings?.push_enabled;
  const reminderOn = pushOn && !!settings?.evening_reminder_enabled;
  const iosNeedsInstall = pushState !== 'unsupported' && isIosNeedsInstall();
  const canEnableHere = pushState !== 'unsupported' && pushState !== 'denied' && !iosNeedsInstall;
  const deviceSubscribed = pushState === 'granted-on';
  // Turning reminders OFF must always be possible, even from a browser that
  // cannot receive them — otherwise a user whose only device is blocked has no
  // way to switch the account setting off at all.
  const pushToggleDisabled = settingsLoading || !settings || (!pushOn && !canEnableHere);

  // The saved zone is account-wide and is what the sender uses, so it is never
  // adopted automatically from whatever browser happens to be open — offered
  // here instead, for the user to accept.
  const detectedTz = browserTimezone();
  const tzDiffers = !!settings && settings.timezone !== detectedTz;

  // The sender has paused because OneSignal reports no device subscribed at
  // all. The account setting is still on; any device that subscribes resumes it.
  const onFor = pushUnreachable ? 'Paused — no device is subscribed' : 'On for your account';

  let pushSub: string;
  if (pushState === 'unsupported') {
    pushSub = pushOn ? `${onFor} — this browser can't receive push` : 'Not supported in this browser';
  } else if (iosNeedsInstall) {
    pushSub = pushOn
      ? `${onFor} — add to your Home Screen to receive here`
      : 'Add Daily Wins to your Home Screen first';
  } else if (pushState === 'blocked') {
    // Kept clickable (canEnableHere): a click explains the fix via a toast.
    pushSub = pushOn
      ? `${onFor} — an ad blocker is stopping it on this device`
      : 'Blocked by an ad blocker (e.g. Brave Shields, uBlock) — allow this site, then reload';
  } else if (pushState === 'denied') {
    pushSub = pushOn
      ? `${onFor} — blocked in this browser`
      : 'Blocked — enable notifications in your browser settings';
  } else if (pushOn && !deviceSubscribed) {
    pushSub = pushUnreachable
      ? `${onFor} — allow notifications on this device to resume`
      : 'On for your account — not enabled on this device yet';
  } else {
    pushSub = 'Daily reminders on every device you allow';
  }

  const themeOptions: Array<[Theme, string]> = [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['sync', 'Auto'],
  ];

  return (
    <div className={device === 'desktop' ? 'dw-canvas' : undefined}>
      <div className="dw-top" style={device === 'desktop' ? { padding: '0 0 14px' } : undefined}>
        <h1>Profile</h1>
        <button className="dw-iconbtn" aria-label="Back to your wins" title="Back to your wins" onClick={() => setScreen('timeline')}>
          <Icon name="home" size={19} />
        </button>
      </div>

      <LoadErrorBanner />

      <div className="dw-prof-head">
        <div className="dw-avatar" aria-hidden="true" style={avatarUrl ? { overflow: 'hidden' } : undefined}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            prefs.name
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                className="dw-input"
                aria-label="Display name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveProfile()}
                style={{ height: 44 }}
                autoFocus
              />
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{prefs.email}</div>
            </div>
          ) : (
            <>
              <div className="dw-display" style={{ fontSize: 22, fontWeight: 700 }}>
                {prefs.name}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>{prefs.email}</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>
                <span>
                  <b style={{ color: 'var(--accent-text)' }}>{loadError && !entries.length ? '—' : entries.length}</b> wins
                </span>
                <span>
                  <b style={{ color: 'var(--accent-text)' }}>{loadError && !entries.length ? '—' : computeStreak(entries)}</b> day
                  streak
                </span>
              </div>
            </>
          )}
        </div>
        <button
          className="dw-btn ghost sm"
          aria-label={editing ? 'Save name' : 'Edit name'}
          onClick={() => {
            if (editing) saveProfile();
            else {
              setName(prefs.name);
              setEditing(true);
            }
          }}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div style={{ height: 18 }} />

      {/* appearance */}
      <h2 className="dw-section-label">Appearance</h2>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <div className="dw-prefrow">
          <div className="ico">
            <Icon name={prefs.theme === 'dark' ? 'moon' : prefs.theme === 'sync' ? 'device' : 'sun'} size={18} />
          </div>
          <div className="lbl">
            <div className="t" id="dw-theme-label">
              Theme
            </div>
            <div className="s">Auto follows your device</div>
          </div>
          <div className="dw-seg3" role="group" aria-labelledby="dw-theme-label">
            {themeOptions.map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={prefs.theme === v}
                className={prefs.theme === v ? 'active' : ''}
                onClick={() => setPrefs((p) => ({ ...p, theme: v }))}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* notifications */}
      <h2 className="dw-section-label">Notifications</h2>
      {!settingsLoading && !settings && (
        <p className="dw-danger-note" role="status">
          Couldn't load your notification settings. Check your connection, then reopen Profile.
        </p>
      )}
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <ToggleRow
          icon="bell"
          title="Push notifications"
          sub={pushSub}
          on={settings?.push_enabled ?? false}
          onToggle={() => setPushEnabled(!(settings?.push_enabled ?? false))}
          disabled={pushToggleDisabled}
          busy={pushBusy}
        />
        <ToggleRow
          icon="clock"
          title="Evening reminder"
          sub={
            !pushOn
              ? 'Turn on push notifications first'
              : settings
                ? `Nudge me at ${formatReminderTime(settings.reminder_local_time)} to log a win`
                : 'Nudge me to log a win'
          }
          on={settings?.evening_reminder_enabled ?? false}
          onToggle={() =>
            updateSettings({ evening_reminder_enabled: !(settings?.evening_reminder_enabled ?? false) })
          }
          disabled={!pushOn}
        />

        {/* reminder time */}
        <div className="dw-prefrow">
          <div className="ico">
            <Icon name="clock" size={18} />
          </div>
          <div className="lbl">
            <label className="t" htmlFor="dw-reminder-time" style={{ display: 'block' }}>
              Reminder time
            </label>
            <div className="s" id="dw-reminder-time-hint">
              {reminderOn ? 'Your local time, in 15-minute steps' : 'Turn on the reminder first'}
            </div>
          </div>
          <input
            id="dw-reminder-time"
            aria-describedby="dw-reminder-time-hint"
            type="time"
            step={900}
            className="dw-input"
            style={{ height: 44, width: 'auto', opacity: reminderOn ? 1 : 0.45 }}
            disabled={!reminderOn}
            value={settings ? toInputTime(settings.reminder_local_time) : '20:00'}
            onChange={(e) => {
              if (!e.target.value) return;
              // The column CHECK only accepts quarter hours, and browsers still
              // allow arbitrary typed values despite step.
              updateSettings({ reminder_local_time: roundToQuarterHour(e.target.value) });
            }}
          />
        </div>

        {/* timezone */}
        <div className="dw-prefrow">
          <div className="ico">
            <Icon name="device" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Time zone</div>
            <div className="s">
              {tzDiffers
                ? `This device is in ${detectedTz} — reminders still use ${settings?.timezone}`
                : 'Reminders are sent in this time zone'}
            </div>
            {tzDiffers && (
              <button
                className="dw-btn ghost sm"
                style={{ marginTop: 8 }}
                onClick={() => updateSettings({ timezone: detectedTz })}
              >
                Switch to {detectedTz}
              </button>
            )}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
            {settings?.timezone ?? '—'}
          </span>
        </div>

        <div className="dw-prefrow">
          <div className="ico">
            <Icon name="mail" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Weekly digest</div>
            <div className="s">A Sunday recap of your wins</div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--accent-text)',
              background: 'var(--accent-soft)',
              padding: '3px 9px',
              borderRadius: 999,
            }}
          >
            Coming soon
          </span>
        </div>
      </div>

      {/* categories */}
      <h2 className="dw-section-label">Categories</h2>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        {categories.map((c) => {
          const count = entries.filter((e) => catById(e.categoryId).id === c.id).length;
          return (
            <button
              key={c.id}
              className="dw-prefrow"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => setCategorySheet({ mode: 'edit', id: c.id })}
            >
              <CatGlyph cat={c} size={34} iconSize={18} />
              <div className="lbl" style={{ minWidth: 0 }}>
                <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div className="s">{count === 1 ? '1 win' : count + ' wins'}</div>
              </div>
              <Icon name="edit" size={16} style={{ color: 'var(--faint)' }} />
            </button>
          );
        })}
        <button
          className="dw-prefrow"
          style={{ width: '100%', textAlign: 'left', ...(atCategoryLimit ? { opacity: 0.55 } : {}) }}
          disabled={atCategoryLimit}
          onClick={() => setCategorySheet({ mode: 'add' })}
        >
          <div className="ico">
            <Icon name="plus" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Add category</div>
            <div className="s">
              {atCategoryLimit ? `You've reached the limit of ${MAX_CATEGORIES}` : 'Name it, pick a color and an icon'}
            </div>
          </div>
          <Icon name="chevR" size={16} style={{ color: 'var(--faint)' }} />
        </button>
      </div>

      {/* help */}
      <h2 className="dw-section-label">Help</h2>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <button className="dw-prefrow" style={{ width: '100%', textAlign: 'left' }} onClick={openTour}>
          <div className="ico">
            <Icon name="spark" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Replay intro</div>
            <div className="s">A 30-second tour of how DailyWins works</div>
          </div>
          <Icon name="chevR" size={16} style={{ color: 'var(--faint)' }} />
        </button>
        <a
          className="dw-prefrow"
          href={ibexoftUrl(IBEXOFT_CONTACT_PATH, 'support', 'profile')}
          target="_blank"
          rel="noopener"
        >
          <div className="ico">
            <Icon name="help" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Contact support</div>
            <div className="s">Questions, problems or feedback</div>
          </div>
          <span className="dw-sr-only">(opens in a new tab)</span>
          <Icon name="external" size={16} style={{ color: 'var(--faint)' }} />
        </a>
      </div>

      {/* account */}
      <h2 className="dw-section-label">Account &amp; data</h2>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <button
          className="dw-prefrow"
          style={{ width: '100%', textAlign: 'left' }}
          disabled={!entries.length}
          onClick={() => setConfirmClear(true)}
        >
          <div className="ico">
            <Icon name="trash" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Delete all wins</div>
            <div className="s">{entries.length ? 'Permanently delete every win' : 'You have no wins to delete'}</div>
          </div>
          <Icon name="chevR" size={16} style={{ color: 'var(--faint)' }} />
        </button>
        <button className="dw-prefrow danger-text" style={{ width: '100%', textAlign: 'left' }} onClick={onSignOut}>
          <div className="ico">
            <Icon name="logout" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Sign out</div>
          </div>
        </button>
      </div>

      <div className="dw-credit">
        DailyWins · v{__APP_VERSION__}
        <br />
        Developed by{' '}
        <a href={jawaidUrl('profile')} target="_blank" rel="noopener">
          Jawaid
        </a>{' '}
        · Powered by{' '}
        <a href={ibexoftUrl('/', 'credit', 'profile')} target="_blank" rel="noopener">
          Ibexoft
        </a>
      </div>

      {confirmClear && (
        <ClearAllSheet
          count={entries.length}
          onClose={() => setConfirmClear(false)}
          onConfirm={() => {
            setConfirmClear(false);
            clearAll();
            setScreen('timeline');
          }}
        />
      )}
    </div>
  );
}

// ============================================ EMPTY
export function Empty() {
  const { openAdd, openTour } = useDW();
  return (
    <div className="dw-empty">
      <div className="ill dw-pop-in">
        <Icon name="check" size={60} sw={2.2} />
      </div>
      <h3>Your wins start here</h3>
      <p>Logged nothing yet? That changes today. Add the first thing you got done — big or small.</p>
      <button className="dw-btn" onClick={openAdd}>
        <Icon name="plus" size={18} sw={2.4} />
        Log your first win
      </button>
      <button className="dw-linkbtn" onClick={openTour}>
        New here? Take the 30-second tour
      </button>
    </div>
  );
}
