import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { trackPageView, trackAuthEvent } from './lib/analytics';
import { Auth } from './components/dw/Auth';
import { Onboarding } from './components/dw/Onboarding';
import { WinsProvider } from './components/dw/WinsProvider';
import { AppShell } from './components/dw/AppShell';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import TermsConditions from './pages/TermsConditions';
import Pricing from './pages/Pricing';
import CheckoutSuccess from './pages/CheckoutSuccess';
import type { User } from '@supabase/supabase-js';

type AppState = 'auth' | 'app';
type AuthMode = 'signin' | 'signup';

const ONBOARDED_KEY = 'dw_onboarded';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [pendingOnboarding, setPendingOnboarding] = useState(false);
  const [shouldOpenCheckout, setShouldOpenCheckout] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAppState(session?.user ? 'app' : 'auth');
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAppState(session?.user ? 'app' : 'auth');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // ?auth=signin or ?auth=signup selects which tab the auth screen opens on
    const params = new URLSearchParams(location.search);
    const authParam = params.get('auth');
    if (authParam === 'signin' || authParam === 'signup') {
      setAuthMode(authParam as AuthMode);
    }
  }, [location.search]);

  // Preserve the Paddle "Pro" checkout flow: ?checkout=pro after auth.
  useEffect(() => {
    if (!user || !shouldOpenCheckout) return;
    (async () => {
      try {
        const env = import.meta.env as unknown as Record<string, string | undefined>;
        const priceId = env.VITE_PADDLE_PRICE_ID;
        if (priceId) {
          const options = {
            customer: { email: user.email },
            passthrough: JSON.stringify({ userId: user.id }),
            success_url: `${window.location.origin}/checkout-success`,
          } as Record<string, unknown>;
          const { openCheckout } = await import('./lib/paddle');
          await openCheckout(priceId, options);
        }
      } catch (err) {
        console.error('[Checkout] Error opening checkout:', err);
      } finally {
        setShouldOpenCheckout(false);
      }
    })();
  }, [user, shouldOpenCheckout]);

  const handleAuthSuccess = (mode: AuthMode) => {
    setAppState('app');
    trackAuthEvent('signin');
    if (mode === 'signup' && !localStorage.getItem(ONBOARDED_KEY)) {
      setPendingOnboarding(true);
    }
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') === 'pro') setShouldOpenCheckout(true);
  };

  const handleSignOut = () => {
    trackAuthEvent('signout');
    supabase.auth.signOut();
    // onAuthStateChange resets user + appState
  };

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setPendingOnboarding(false);
  };

  // Track page views when app state changes
  useEffect(() => {
    trackPageView(appState === 'app' ? 'Daily Wins App' : 'Authentication');
  }, [appState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Unauthenticated users go straight to the sign in / register screen.
  const renderHome = () => {
    if (user && pendingOnboarding) {
      return <Onboarding onDone={finishOnboarding} />;
    }
    if (user) {
      return (
        <WinsProvider userEmail={user.email || ''} onSignOut={handleSignOut}>
          <AppShell />
        </WinsProvider>
      );
    }
    return <Auth onAuthSuccess={handleAuthSuccess} initialMode={authMode} />;
  };

  return (
    <Routes>
      <Route path="/" element={renderHome()} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/checkout-success" element={<CheckoutSuccess />} />
      <Route path="*" element={renderHome()} />
    </Routes>
  );
}

export default App;
