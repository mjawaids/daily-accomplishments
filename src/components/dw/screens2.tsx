/* DailyWins — Profile + Empty screens (rendered inside the app shell).
   Ported from the Claude Design handoff (app/screens2.jsx). Accent picker and
   "restore sample data" are dropped per the agreed scope (defaults only). */
import { useState } from 'react';
import { useDW } from './WinsProvider';
import type { Theme } from './WinsProvider';
import type { Device } from './useDevice';
import { Icon, CatGlyph } from './icons';
import { CATEGORY_KEYS, CATS, computeStreak } from '../../lib/winsData';

interface ToggleRowProps {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  sub?: string;
  on: boolean;
  onToggle: () => void;
}

function ToggleRow({ icon, title, sub, on, onToggle }: ToggleRowProps) {
  return (
    <div className="dw-prefrow">
      <div className="ico">
        <Icon name={icon} size={18} />
      </div>
      <div className="lbl">
        <div className="t">{title}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
      <button className={'dw-toggle' + (on ? ' on' : '')} onClick={onToggle}>
        <span className="knob" />
      </button>
    </div>
  );
}

export function Profile({ device }: { device: Device }) {
  const { prefs, setPrefs, setScreen, entries, clearAll, onSignOut } = useDW();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(prefs.name);
  const [email, setEmail] = useState(prefs.email);

  const saveProfile = () => {
    setPrefs((p) => ({ ...p, name, email }));
    setEditing(false);
  };

  const themeOptions: Array<[Theme, string]> = [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['sync', 'Auto'],
  ];

  return (
    <div className={device === 'desktop' ? 'dw-canvas' : undefined}>
      <div className="dw-top" style={device === 'desktop' ? { padding: '0 0 14px' } : undefined}>
        <h1>Profile</h1>
        <button className="dw-iconbtn" onClick={() => setScreen('timeline')}>
          <Icon name="home" size={19} />
        </button>
      </div>

      <div className="dw-prof-head">
        <div className="dw-avatar">
          {prefs.name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="dw-input" value={name} onChange={(e) => setName(e.target.value)} style={{ height: 40 }} />
              <input className="dw-input" value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 40 }} />
            </div>
          ) : (
            <>
              <div className="dw-display" style={{ fontSize: 22, fontWeight: 700 }}>
                {prefs.name}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>{prefs.email}</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>
                <span>
                  <b style={{ color: 'var(--accent)' }}>{entries.length}</b> wins
                </span>
                <span>
                  <b style={{ color: 'var(--accent)' }}>{computeStreak(entries)}</b> day streak
                </span>
              </div>
            </>
          )}
        </div>
        <button className="dw-btn ghost sm" onClick={() => (editing ? saveProfile() : setEditing(true))}>
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div style={{ height: 18 }} />

      {/* appearance */}
      <div className="dw-section-label">Appearance</div>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <div className="dw-prefrow">
          <div className="ico">
            <Icon name={prefs.theme === 'dark' ? 'moon' : prefs.theme === 'sync' ? 'device' : 'sun'} size={18} />
          </div>
          <div className="lbl">
            <div className="t">Theme</div>
            <div className="s">Syncs with your device when set to Auto</div>
          </div>
          <div className="dw-seg3">
            {themeOptions.map(([v, l]) => (
              <button
                key={v}
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
      <div className="dw-section-label">Notifications</div>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <ToggleRow
          icon="bell"
          title="Push notifications"
          sub="Reminders & streak alerts"
          on={prefs.notifications}
          onToggle={() => setPrefs((p) => ({ ...p, notifications: !p.notifications }))}
        />
        <ToggleRow
          icon="clock"
          title="Evening reminder"
          sub="Nudge me at 8:00 PM to log a win"
          on={prefs.eveningReminder}
          onToggle={() => setPrefs((p) => ({ ...p, eveningReminder: !p.eveningReminder }))}
        />
        <ToggleRow
          icon="mail"
          title="Weekly digest"
          sub="A Sunday recap of your wins"
          on={prefs.weekdigest}
          onToggle={() => setPrefs((p) => ({ ...p, weekdigest: !p.weekdigest }))}
        />
      </div>

      {/* categories */}
      <div className="dw-section-label">Categories</div>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        {CATEGORY_KEYS.map((c) => (
          <div key={c} className="dw-prefrow">
            <CatGlyph cat={c} size={34} iconSize={18} />
            <div className="lbl">
              <div className="t">{CATS[c].label}</div>
              <div className="s">{entries.filter((e) => e.category === c).length + ' wins'}</div>
            </div>
            <Icon name="chevR" size={16} style={{ color: 'var(--faint)' }} />
          </div>
        ))}
        <div className="dw-prefrow" style={{ opacity: 0.7 }}>
          <div className="ico">
            <Icon name="plus" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Add custom category</div>
            <div className="s">Coming in a future version</div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '3px 9px',
              borderRadius: 999,
            }}
          >
            SOON
          </span>
        </div>
      </div>

      {/* account */}
      <div className="dw-section-label">Account &amp; data</div>
      <div className="dw-prefcard" style={{ marginBottom: 18 }}>
        <button
          className="dw-prefrow"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => {
            clearAll();
            setScreen('timeline');
          }}
        >
          <div className="ico">
            <Icon name="trash" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Clear all entries</div>
            <div className="s">Permanently delete every win</div>
          </div>
          <Icon name="chevR" size={16} style={{ color: 'var(--faint)' }} />
        </button>
        <button
          className="dw-prefrow"
          style={{ width: '100%', textAlign: 'left', color: 'var(--cat-personal)' }}
          onClick={onSignOut}
        >
          <div className="ico" style={{ color: 'var(--cat-personal)' }}>
            <Icon name="logout" size={18} />
          </div>
          <div className="lbl">
            <div className="t">Sign out</div>
          </div>
        </button>
      </div>

      <div className="dw-credit">
        DailyWins · v0.1
        <br />
        Developed with ❤️ by{' '}
        <a href="https://jawaid.dev" target="_blank" rel="noreferrer">
          Jawaid
        </a>{' '}
        · Powered by 🚀{' '}
        <a href="https://ibexoft.com" target="_blank" rel="noreferrer">
          Ibexoft
        </a>
      </div>
    </div>
  );
}

// ============================================ EMPTY
export function Empty() {
  const { openAdd } = useDW();
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
    </div>
  );
}
