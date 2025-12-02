import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { trackPageView, trackAuthEvent } from './lib/analytics';
import { LandingPage } from './components/LandingPage';
import { AuthForm } from './components/AuthForm';
import { AccomplishmentApp } from './components/AccomplishmentApp';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import TermsConditions from './pages/TermsConditions';
import Pricing from './pages/Pricing';
import CheckoutSuccess from './pages/CheckoutSuccess';
import type { User } from '@supabase/supabase-js';

type AppState = 'landing' | 'auth' | 'app';
type AuthMode = 'signin' | 'signup';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const location = useLocation();
  const [shouldOpenCheckout, setShouldOpenCheckout] = useState(false);
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setAppState('app');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setAppState('app');
      } else {
        setAppState('landing');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // If URL contains ?auth=signin or ?auth=signup, open auth view
    const params = new URLSearchParams(location.search);
    const authParam = params.get('auth');
    if (authParam === 'signin' || authParam === 'signup') {
      setAuthMode(authParam as AuthMode);
      setAppState('auth');
    }
  }, [location.search]);

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAppState('auth');
  };

  const handleAuthSuccess = () => {
    // User state will be updated by the auth state change listener
    setAppState('app');
    trackAuthEvent('signin');
    
    // If user clicked Pro and was redirected to auth with ?checkout=pro, trigger checkout
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') === 'pro') {
      setShouldOpenCheckout(true);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setAppState('landing');
    trackAuthEvent('signout');
  };

  const handleBackToLanding = () => {
    setAppState('landing');
  };
  // Policy and pricing pages are now handled by routes

  // Track page views when app state changes
  useEffect(() => {
    switch (appState) {
      case 'landing':
        trackPageView('Landing Page');
        break;
      case 'auth':
        trackPageView('Authentication');
        break;
      case 'app':
        trackPageView('Daily Wins App');
        break;
    }
  }, [appState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          appState === 'auth' ? (
            <AuthForm 
              onAuthSuccess={handleAuthSuccess} 
              onBack={handleBackToLanding}
              initialMode={authMode}
            />
          ) : user ? (
            <AccomplishmentApp 
              onSignOut={handleSignOut} 
              userEmail={user.email || ''}
              shouldOpenCheckout={shouldOpenCheckout}
              onCheckoutComplete={() => setShouldOpenCheckout(false)}
            />
          ) : (
            <LandingPage onShowAuth={handleShowAuth} />
          )
        }
      />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/pricing" element={<Pricing />} />
  <Route path="/checkout-success" element={<CheckoutSuccess />} />
      <Route path="*" element={<LandingPage onShowAuth={handleShowAuth} />} />
    </Routes>
  );
}

export default App;