/* Stands in for vite-plugin-pwa's `virtual:pwa-register/react` during
   `npm run ui:check`. Service workers are blocked there, so the real module
   never reports an update; this one reports a waiting worker when the page set
   `window.__UI_CHECK_NEED_REFRESH__`, so the update banner can be screenshotted. */
import { useState } from 'react';

export function useRegisterSW() {
  const needRefresh = useState(() => typeof window !== 'undefined' && !!window.__UI_CHECK_NEED_REFRESH__);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: async () => {} };
}
