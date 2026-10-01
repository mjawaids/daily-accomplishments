import { useState, useEffect } from 'react';
import { trackPWAEvent } from '../lib/analytics';
import { promptInstall, useInstallMode } from '../lib/install';
import { Icon } from './dw/icons';

/** The one-time nudge. Only where the browser can install directly (Chromium);
    iOS and Safari users get the steps from the Install app entry points instead
    (src/components/dw/InstallSteps.tsx). */
export function InstallPrompt() {
  const mode = useInstallMode();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (mode !== 'prompt') {
      setShowPrompt(false);
      return;
    }
    // Show our custom install prompt after a delay
    const t = setTimeout(() => {
      setShowPrompt(true);
      trackPWAEvent('install_prompt_shown');
    }, 3000);
    return () => clearTimeout(t);
  }, [mode]);

  const handleInstallClick = () => {
    setShowPrompt(false);
    void promptInstall();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    trackPWAEvent('install_dismissed');
    // Don't show again for this session
    try {
      sessionStorage.setItem('installPromptDismissed', 'true');
    } catch {
      /* storage unavailable: it just shows again next time */
    }
  };

  let dismissed = false;
  try {
    dismissed = !!sessionStorage.getItem('installPromptDismissed');
  } catch {
    /* storage unavailable */
  }
  if (mode !== 'prompt' || !showPrompt || dismissed) {
    return null;
  }

  return (
    <section className="dw-prompt dw-prompt--install" aria-labelledby="dw-install-title">
      <div className="card">
        <div className="ico">
          <Icon name="device" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="t" id="dw-install-title">
            Install DailyWins
          </h2>
          <div className="s">Add it to your home screen for quick access and offline use.</div>
          <div className="acts">
            <button className="dw-btn sm" onClick={handleInstallClick}>
              <Icon name="download" size={15} sw={2.2} />
              Install
            </button>
            <button className="dw-btn ghost sm" onClick={handleDismiss}>
              Not now
            </button>
          </div>
        </div>
        <button className="dw-iconbtn" onClick={handleDismiss} aria-label="Dismiss install prompt" title="Dismiss">
          <Icon name="x" size={16} />
        </button>
      </div>
    </section>
  );
}
