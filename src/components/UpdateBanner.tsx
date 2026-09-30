import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from './dw/icons';

/* Surfaces a waiting service worker.

   The plugin is configured with registerType: 'prompt', so a new worker installs
   and then waits rather than taking over mid-session -- nobody loses a half-typed
   win to a surprise reload. If this banner is dismissed or ignored, the waiting
   worker activates on its own once every tab is closed, so the update applies
   silently the next time the app is opened. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  if (!needRefresh) return null;

  // Rendered above the routes, outside any .dw-app, so it carries its own
  // .dw-app scope (tokens, theme) with the display reset that keeps it from
  // taking the full-screen app layout.
  const dark = document.documentElement.classList.contains('dark');
  return (
    <div className="dw-app dw-app--bare" data-theme={dark ? 'dark' : 'light'} data-accent="sunrise">
      <div className="dw-updatebar" role="status">
        <Icon name="sync" size={17} />
        <span className="msg">A new version is ready</span>
        <button className="dw-btn sm" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
        <button className="dw-iconbtn" aria-label="Dismiss update message" onClick={() => setNeedRefresh(false)}>
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
