import { useState, useEffect } from 'react';
import { trackPWAEvent } from '../lib/analytics';
import { Icon } from './dw/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      if (window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom install prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
        trackPWAEvent('install_prompt_shown');
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        trackPWAEvent('install_accepted');
      } else {
        trackPWAEvent('install_dismissed');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    trackPWAEvent('install_dismissed');
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if already installed, no prompt available, or dismissed this session
  if (isInstalled || !deferredPrompt || !showPrompt || sessionStorage.getItem('installPromptDismissed')) {
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
