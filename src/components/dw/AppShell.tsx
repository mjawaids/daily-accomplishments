/* DailyWins — authenticated app shell. Responsive: desktop sidebar vs mobile tab
   bar, add/edit sheet, toast + confetti. Ported from app/app.jsx (DailyWinsApp,
   Sidebar, MobileNav, AddEditLayer); tweaks/device-frames/Stage are not ported. */
import React from 'react';
import { Toast, Confetti } from './WinsProvider';
import { useDW } from './useDW';
import { useDevice, useResolvedTheme } from './useDevice';
import type { Device } from './useDevice';
import { Icon, Logo } from './icons';
import type { IconName } from './icons';
import { Avatar, EntryForm, Sheet } from './components';
import { OfflineIndicator } from '../OfflineIndicator';
import { Timeline, Insights } from './screens';
import { Profile } from './screens2';
import { InstallPrompt } from '../InstallPrompt';
import { PushPrompt } from './PushPrompt';
import { CategorySheet } from './CategorySheet';
import { Onboarding } from './Onboarding';
import { useInstallAction } from './useInstallAction';

// ---- desktop sidebar ----
function Sidebar() {
  const { screen, setScreen, entries, openAdd, prefs } = useDW();
  const install = useInstallAction();
  const item = (id: 'timeline' | 'insights', icon: IconName, label: string) => (
    <button
      key={id}
      className={'dw-navitem' + (screen === id ? ' active' : '')}
      aria-current={screen === id ? 'page' : undefined}
      onClick={() => setScreen(id)}
    >
      <Icon name={icon} size={20} />
      <span className="lbl">{label}</span>
      {id === 'timeline' && (
        <span className="ct" aria-label={`${entries.length} ${entries.length === 1 ? 'win' : 'wins'}`}>
          {entries.length}
        </span>
      )}
    </button>
  );
  return (
    <nav className="dw-sidebar" aria-label="Main">
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
      </div>
      {/* only while there is an install to offer on this device (lib/install.ts) */}
      {install.available && (
        <button className="dw-navitem dw-navitem--install" onClick={install.start}>
          <Icon name="download" size={20} />
          <span className="lbl">
            Install app
            <span className="sub">Opens in its own window</span>
          </span>
        </button>
      )}
      {install.sheet}
      {/* user chip opens Profile (no separate Profile nav link) */}
      <button
        className={'dw-profilechip' + (screen === 'profile' ? ' active' : '')}
        title="Profile"
        aria-current={screen === 'profile' ? 'page' : undefined}
        onClick={() => setScreen('profile')}
      >
        <Avatar size={36} />
        <div className="who">
          <div className="name">{prefs.name}</div>
          <div className="sub">View profile</div>
        </div>
      </button>
    </nav>
  );
}

// ---- mobile bottom nav (Profile is reached via the header avatar) ----
function MobileNav() {
  const { screen, setScreen } = useDW();
  const items: Array<['timeline' | 'insights', IconName, string]> = [
    ['timeline', 'home', 'Home'],
    ['insights', 'insights', 'Insights'],
  ];
  return (
    <nav className="dw-tabbar" aria-label="Main">
      {items.map(([id, icon, label]) => (
        <button
          key={id}
          className={'dw-tab' + (screen === id ? ' active' : '')}
          aria-current={screen === id ? 'page' : undefined}
          onClick={() => setScreen(id)}
        >
          <Icon name={icon} size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ---- add / edit sheet ----
function AddEditLayer() {
  const { sheetOpen, setSheetOpen } = useDW();
  if (!sheetOpen) return null;
  const close = () => setSheetOpen(false);
  return (
    <Sheet labelledBy="dw-entry-title" onClose={close}>
      <EntryForm onDone={close} titleId="dw-entry-title" />
    </Sheet>
  );
}

const SCREENS: Record<'timeline' | 'insights' | 'profile', (p: { device: Device }) => React.ReactElement> = {
  timeline: Timeline,
  insights: Insights,
  profile: Profile,
};

export function AppShell() {
  const { screen, loading, prefs, tourOpen, closeTour } = useDW();
  const device = useDevice();
  const theme = useResolvedTheme(prefs.theme);
  const Screen = SCREENS[screen] || Timeline;

  return (
    <div className="dw-app" data-device={device} data-theme={theme} data-accent="sunrise" data-font="bricolage">
      {loading ? (
        <div className="dw-scroll" style={{ display: 'grid', placeItems: 'center' }} role="status">
          <div className="dw-spinner" aria-hidden="true" />
          <span className="dw-sr-only">Loading your wins…</span>
        </div>
      ) : device === 'desktop' ? (
        <>
          <Sidebar />
          <main className="dw-main">
            <div className="dw-scroll">
              <Screen device={device} />
            </div>
          </main>
        </>
      ) : (
        <>
          <main className="dw-scroll">
            <Screen device={device} />
          </main>
          <MobileNav />
        </>
      )}
      <OfflineIndicator />
      <AddEditLayer />
      <CategorySheet />
      <Toast />
      <Confetti />
      <InstallPrompt />
      <PushPrompt />
      {tourOpen && <Onboarding mode="replay" onDone={closeTour} />}
    </div>
  );
}

export type { Device };
