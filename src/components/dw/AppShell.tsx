/* DailyWins — authenticated app shell. Responsive: desktop sidebar vs mobile tab
   bar, add/edit sheet, toast + confetti. Ported from app/app.jsx (DailyWinsApp,
   Sidebar, MobileNav, AddEditLayer); tweaks/device-frames/Stage are not ported. */
import React from 'react';
import { useDW, Toast, Confetti } from './WinsProvider';
import { useDevice, useResolvedTheme } from './useDevice';
import type { Device } from './useDevice';
import { Icon, Logo } from './icons';
import type { IconName } from './icons';
import { EntryForm } from './components';
import { Timeline, Insights } from './screens';
import { Profile } from './screens2';

// ---- desktop sidebar ----
function Sidebar() {
  const { screen, setScreen, entries, openAdd, prefs } = useDW();
  const item = (id: 'timeline' | 'insights' | 'profile', icon: IconName, label: string) => (
    <button key={id} className={'dw-navitem' + (screen === id ? ' active' : '')} onClick={() => setScreen(id)}>
      <Icon name={icon} size={20} />
      <span className="lbl">{label}</span>
      {id === 'timeline' && <span className="ct">{entries.length}</span>}
    </button>
  );
  const initials = prefs.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
  return (
    <div className="dw-sidebar">
      <div style={{ padding: '4px 8px 22px' }}>
        <Logo size={32} fontSize={20} />
      </div>
      <button className="dw-btn block" style={{ marginBottom: 18 }} onClick={openAdd}>
        <Icon name="plus" size={18} sw={2.4} />
        Log a win
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {item('timeline', 'home', 'Timeline')}
        {item('insights', 'insights', 'Insights')}
        {item('profile', 'user', 'Profile')}
      </div>
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 8px',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div className="dw-avatar" style={{ width: 36, height: 36, borderRadius: 12, fontSize: 14 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
          <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prefs.name}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>Free plan</div>
        </div>
      </div>
    </div>
  );
}

// ---- mobile bottom nav ----
function MobileNav() {
  const { screen, setScreen } = useDW();
  const items: Array<['timeline' | 'insights' | 'profile', IconName, string]> = [
    ['timeline', 'home', 'Home'],
    ['insights', 'insights', 'Insights'],
    ['profile', 'user', 'Profile'],
  ];
  return (
    <div className="dw-tabbar">
      {items.map(([id, icon, label]) => (
        <button key={id} className={'dw-tab' + (screen === id ? ' active' : '')} onClick={() => setScreen(id)}>
          <Icon name={icon} size={22} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ---- add / edit sheet ----
function AddEditLayer() {
  const { sheetOpen, setSheetOpen } = useDW();
  if (!sheetOpen) return null;
  const close = () => setSheetOpen(false);
  return (
    <div className="dw-scrim" onClick={close}>
      <div className="dw-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dw-grab" />
        <EntryForm onDone={close} />
      </div>
    </div>
  );
}

const SCREENS: Record<'timeline' | 'insights' | 'profile', (p: { device: Device }) => React.ReactElement> = {
  timeline: Timeline,
  insights: Insights,
  profile: Profile,
};

export function AppShell() {
  const { screen, loading, prefs } = useDW();
  const device = useDevice();
  const theme = useResolvedTheme(prefs.theme);
  const Screen = SCREENS[screen] || Timeline;

  return (
    <div className="dw-app" data-device={device} data-theme={theme} data-accent="sunrise" data-font="bricolage">
      {loading ? (
        <div className="dw-scroll" style={{ display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '4px solid var(--line-2)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'dw-spin 0.8s linear infinite',
            }}
          />
          <style>{'@keyframes dw-spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : device === 'desktop' ? (
        <>
          <Sidebar />
          <div className="dw-main">
            <div className="dw-scroll">
              <Screen device={device} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="dw-scroll">
            <Screen device={device} />
          </div>
          <MobileNav />
        </>
      )}
      <AddEditLayer />
      <Toast />
      <Confetti />
    </div>
  );
}

export type { Device };
