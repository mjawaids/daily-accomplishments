/* DailyWins — shared by every "Install app" entry point (sidebar, Timeline
   header, Profile, sign-in): opens the browser's install dialog where there is
   one (Chromium), and otherwise the steps sheet (iOS, macOS Safari).
   See src/lib/install.ts for how the mode is chosen. */
import { useState } from 'react';
import { InstallSteps } from './InstallSteps';
import type { StepsMode } from './InstallSteps';
import { canOfferInstall, promptInstall, useInstallMode } from '../../lib/install';
import { trackPWAEvent } from '../../lib/analytics';

/** For an "Install app" control: whether to show it, what a click does, and the
    sheet to render alongside it (null unless the steps are open). */
export function useInstallAction() {
  const mode = useInstallMode();
  const [steps, setSteps] = useState<StepsMode | null>(null);
  const start = () => {
    if (mode === 'prompt') {
      void promptInstall();
    } else if (mode === 'ios' || mode === 'mac-safari') {
      setSteps(mode);
      trackPWAEvent('install_steps_shown');
    }
  };
  const sheet = steps ? <InstallSteps mode={steps} onClose={() => setSteps(null)} /> : null;
  return { mode, available: canOfferInstall(mode), start, sheet };
}
