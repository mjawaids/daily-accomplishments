/* DailyWins — Auth screen (split brand + form). Standalone: rendered before the
   user is authenticated, so it talks to Supabase directly rather than via useDW.
   Ported from the Claude Design handoff (app/screens2.jsx). */
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { trackAuthEvent } from '../../lib/analytics';
import { Icon, Logo, CAT_ICON } from './icons';
import { CATEGORY_KEYS, CATS } from '../../lib/winsData';
import { useDevice, useResolvedTheme, getStoredTheme } from './useDevice';

type Mode = 'signin' | 'signup';

interface AuthProps {
  onAuthSuccess: (mode: Mode) => void;
  onBack: () => void;
  initialMode?: Mode;
}

// small multicolor Google glyph
function GoogleG() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.7 9.4 6.1 12 6.1Z" />
    </svg>
  );
}

export function Auth({ onAuthSuccess, onBack, initialMode = 'signin' }: AuthProps) {
  const device = useDevice();
  const theme = useResolvedTheme(getStoredTheme());
  const [mode, setMode] = useState<Mode>(initialMode);
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignup) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        // carry the chosen name into local prefs so Profile shows it
        try {
          const raw = localStorage.getItem('dw_prefs');
          const prev = raw ? JSON.parse(raw) : {};
          localStorage.setItem('dw_prefs', JSON.stringify({ ...prev, name: name || email.split('@')[0], email }));
        } catch {
          /* ignore */
        }
        trackAuthEvent('signup');
        onAuthSuccess('signup');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuthSuccess('signin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="dw-app" data-device={device} data-theme={theme} data-accent="sunrise" data-font="bricolage">
      <div className="dw-auth">
        <div className="dw-auth-brand">
          <div className="blob" style={{ width: 220, height: 220, top: -60, right: -50 }} />
          <div className="blob" style={{ width: 140, height: 140, bottom: 30, left: -40 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Logo size={device === 'desktop' ? 42 : 36} fontSize={device === 'desktop' ? 26 : 22} color="#fff" />
          </div>
          <div style={{ position: 'relative', zIndex: 1, marginTop: device === 'desktop' ? 0 : 22 }}>
            <div className="dw-display" style={{ fontSize: device === 'desktop' ? 40 : 27, fontWeight: 700, maxWidth: '14ch', lineHeight: 1.05 }}>
              Celebrate what you actually got done.
            </div>
            <p style={{ marginTop: 14, opacity: 0.92, fontSize: device === 'desktop' ? 16 : 14, maxWidth: '34ch' }}>
              A calm daily log for your wins — track progress, build streaks, and reflect on how far you’ve come.
            </p>
            {device === 'desktop' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 26, flexWrap: 'wrap' }}>
                {CATEGORY_KEYS.map((c) => (
                  <span
                    key={c}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 13px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,.16)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Icon name={CAT_ICON[c]} size={15} sw={2.2} />
                    {CATS[c].label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form className="dw-auth-form" onSubmit={submit}>
          <div style={{ width: '100%' }}>
            <button
              type="button"
              className="dw-iconbtn"
              style={{ marginBottom: 18 }}
              onClick={onBack}
              title="Back"
            >
              <Icon name="chevL" size={20} />
            </button>
            <h2 className="dw-display" style={{ fontSize: 25, fontWeight: 700, marginBottom: 6 }}>
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 22 }}>
              {isSignup ? 'Start your streak today — it’s free.' : 'Pick up where you left off.'}
            </p>
            <div className="dw-segment">
              <button type="button" className={!isSignup ? 'active' : ''} onClick={() => setMode('signin')}>
                Sign in
              </button>
              <button type="button" className={isSignup ? 'active' : ''} onClick={() => setMode('signup')}>
                Sign up
              </button>
            </div>
            <button type="button" className="dw-oauth" onClick={googleSignIn}>
              <GoogleG />
              Continue with Google
            </button>
            <div className="dw-divider">or</div>
            {isSignup && (
              <div className="dw-field">
                <label>Name</label>
                <div className="dw-inputrow">
                  <Icon name="user" size={18} />
                  <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
            )}
            <div className="dw-field">
              <label>Email</label>
              <div className="dw-inputrow">
                <Icon name="mail" size={18} />
                <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="dw-field">
              <label>Password</label>
              <div className="dw-inputrow">
                <Icon name="lock" size={18} />
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="dw-iconbtn"
                  style={{ width: 30, height: 30, boxShadow: 'none', background: 'transparent' }}
                  onClick={() => setShow((s) => !s)}
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
            </div>
            {error && (
              <div
                style={{
                  background: 'color-mix(in oklab, var(--cat-personal) 12%, var(--surface))',
                  border: '1px solid color-mix(in oklab, var(--cat-personal) 30%, transparent)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginBottom: 12,
                  color: 'var(--cat-personal)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}
            <button type="submit" className="dw-btn block" style={{ marginTop: 6, height: 46 }} disabled={loading}>
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
              Secured by Supabase Auth. By continuing you agree to our Terms &amp; Privacy Policy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
