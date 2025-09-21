import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { trackPageView, trackAuthEvent } from './lib/analytics';
import { LandingPage } from './components/LandingPage';
import { AuthForm } from './components/AuthForm';
import { AccomplishmentApp } from './components/AccomplishmentApp';
import type { User } from '@supabase/supabase-js';

type AppState = 'landing' | 'auth' | 'app';
type AuthMode = 'signin' | 'signup';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

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

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAppState('auth');
  };

  const handleAuthSuccess = () => {
    // User state will be updated by the auth state change listener
    setAppState('app');
    trackAuthEvent('signin');
  };

  const handleSignOut = () => {
    setUser(null);
    setAppState('landing');
    trackAuthEvent('signout');
  };

  const handleBackToLanding = () => {
    setAppState('landing');
  };

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

  if (appState === 'landing') {
    return <LandingPage onShowAuth={handleShowAuth} />;
  }

  if (appState === 'auth') {
    return (
      <AuthForm 
        onAuthSuccess={handleAuthSuccess} 
        onBack={handleBackToLanding}
        initialMode={authMode}
      />
    );
  }

  if (user) {
    return (
      <AccomplishmentApp 
        onSignOut={handleSignOut} 
        userEmail={user.email || ''} 
      />
    );
  }

  return <LandingPage onShowAuth={handleShowAuth} />;
}

export default App;