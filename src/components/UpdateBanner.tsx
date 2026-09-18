import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

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

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-md">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
        <RefreshCw className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium flex-1">New version available</span>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all"
        >
          Reload
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
          className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
