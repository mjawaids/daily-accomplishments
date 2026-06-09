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
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
        maxWidth: 380,
        marginLeft: 'auto',
        zIndex: 70,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: '14px 16px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
        >
          <Icon name="device" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Install DailyWins</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '2px 0 10px' }}>
            Add to your home screen for quick access and offline use.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="dw-btn sm" onClick={handleInstallClick}>
              <Icon name="download" size={15} sw={2.2} />
              Install
            </button>
            <button className="dw-btn ghost sm" onClick={handleDismiss}>
              Not now
            </button>
          </div>
        </div>
        <button
          className="dw-iconbtn"
          style={{ width: 30, height: 30, boxShadow: 'none', background: 'transparent' }}
          onClick={handleDismiss}
          title="Dismiss"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
