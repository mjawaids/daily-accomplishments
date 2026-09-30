/* DailyWins — 3-step onboarding carousel. Shown once after signup as a
   standalone frame ("first-run"), and replayable any time from Profile → Help,
   the empty state or ?tour=1 as an overlay on top of the app ("replay").
   Ported from the Claude Design handoff (app/screens2.jsx). */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Icon, Logo, CatGlyph } from './icons';
import type { IconName } from './icons';
import { DEFAULT_CATEGORIES, catColorVar, categoryColor } from '../../lib/categories';
import type { Category } from '../../lib/categories';
import { trackEvent } from '../../lib/analytics';
import { useDevice, useResolvedTheme, getStoredTheme } from './useDevice';
import { isTypingTarget } from './keys';

interface Step {
  icon: IconName;
  title: string;
  body: string;
}

const ONB: Step[] = [
  {
    icon: 'check',
    title: 'Record what you actually did',
    body: 'Most apps track what you plan to do. DailyWins captures what you got done — your real progress, in your own words.',
  },
  {
    icon: 'flame',
    title: 'Build a quiet momentum',
    body: 'One win a day keeps your streak alive. Gentle nudges help you show up — no guilt, no noise.',
  },
  {
    icon: 'insights',
    title: 'Reflect & look back',
    body: 'Browse a timeline of everything you’ve achieved, see your patterns, and remember how far you’ve come.',
  },
];

/** Step 1 chip positions (Work, Health, Learning): top-left, top-right, bottom-centre. */
const CHIP_SPOTS: CSSProperties[] = [
  { top: 16, left: 12 },
  { top: 16, right: 12 },
  { bottom: 16, left: 0, right: 0, marginInline: 'auto' },
];

export type OnboardingMode = 'first-run' | 'replay';

/** Matches the .dw-onb-overlay exit animation in dailywins.css. */
const CLOSE_MS = 180;
/** Horizontal travel (px) that counts as a swipe between steps. */
const SWIPE_PX = 50;

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Onboarding({ onDone, mode = 'first-run' }: { onDone: () => void; mode?: OnboardingMode }) {
  const replay = mode === 'replay';
  const device = useDevice();
  const theme = useResolvedTheme(getStoredTheme());
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const s = ONB[step];
  const last = step === ONB.length - 1;
  const titleId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const swipeX = useRef<number | null>(null);
  const done = useRef(false);

  const close = useCallback(
    (completed: boolean) => {
      if (done.current) return;
      done.current = true;
      trackEvent(completed ? 'tour_complete' : 'tour_close', 'Onboarding', mode);
      if (!replay || prefersReducedMotion()) {
        onDone();
        return;
      }
      setClosing(true);
      setTimeout(onDone, CLOSE_MS);
    },
    [mode, replay, onDone]
  );

  const goTo = useCallback((i: number) => setStep(Math.max(0, Math.min(ONB.length - 1, i))), []);
  const next = () => (last ? close(true) : goTo(step + 1));

  // Opening: note what had focus (the "Replay intro" row, say) so closing can
  // hand it back, and move focus into the dialog.
  useEffect(() => {
    trackEvent('tour_open', 'Onboarding', mode);
    const returnTo = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    return () => {
      if (returnTo && returnTo !== document.body && document.contains(returnTo)) returnTo.focus();
    };
  }, [mode]);

  // The Back button disappears on step 1; don't strand focus on <body>.
  useEffect(() => {
    if (step === 0 && !backRef.current && dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      primaryRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(step + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(step - 1);
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Keep Tab inside the dialog while it is open.
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && (active === lastItem || !dialogRef.current.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goTo, close]);

  const onPointerDown = (e: ReactPointerEvent) => {
    swipeX.current = e.pointerType === 'mouse' ? null : e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (swipeX.current === null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    if (dx <= -SWIPE_PX) goTo(step + 1);
    else if (dx >= SWIPE_PX) goTo(step - 1);
  };

  const byKey = (k: string) => DEFAULT_CATEGORIES.find((c) => c.legacy_key === k) as Category;
  const chipCats = ['work', 'health', 'learning'].map(byKey);
  const barCats = ['work', 'health', 'personal'].map(byKey);

  const art = (
    <div
      key={step}
      className="art"
      aria-hidden="true"
      style={{
        background:
          'linear-gradient(150deg, color-mix(in oklab,var(--accent) 16%,var(--surface)), color-mix(in oklab,var(--accent-2) 18%,var(--surface)))',
        width: device === 'desktop' ? 230 : 200,
        height: device === 'desktop' ? 230 : 200,
      }}
    >
      <div className="dw-mark dw-pop-in" style={{ width: 88, height: 88 }}>
        <Icon name={s.icon} size={42} style={{ color: '#fff' }} />
      </div>
      {step === 0 &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="dw-chip dw-pop-in"
            style={{
              position: 'absolute',
              // Anchored to the art's edges, not fixed offsets, so no chip is
              // clipped at either art size (200px mobile, 230px desktop).
              ...CHIP_SPOTS[i],
              width: 'max-content',
              animationDelay: i * 90 + 120 + 'ms',
              boxShadow: 'var(--shadow-sm)',
              ...catColorVar(chipCats[i]),
            }}
          >
            <CatGlyph cat={chipCats[i]} size={17} />
            {chipCats[i].name}
          </span>
        ))}
      {step === 1 && (
        <div className="dw-streak dw-pop-in" style={{ position: 'absolute', bottom: 26, animationDelay: '160ms' }}>
          <Icon name="flame" size={16} style={{ color: 'var(--accent)' }} />
          <span className="n">7</span> day streak
        </div>
      )}
      {step === 2 &&
        [40, 90, 150].map((t, i) => (
          <div
            key={i}
            className="dw-pop-in"
            style={{
              position: 'absolute',
              top: t,
              right: 18 + (i % 2) * 8,
              width: 70 - i * 4,
              height: 8,
              borderRadius: 5,
              background: categoryColor(barCats[i]),
              animationDelay: i * 100 + 120 + 'ms',
              opacity: 0.8,
            }}
          />
        ))}
    </div>
  );

  const frame = (
    <div
      ref={dialogRef}
      className="dw-onb"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-roledescription="carousel"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: replay ? '18px 18px 0 22px' : device === 'desktop' ? '26px 30px 0' : '46px 22px 0',
        }}
      >
        <Logo size={30} fontSize={19} />
        {replay ? (
          <button className="dw-iconbtn" aria-label="Close intro" onClick={() => close(false)}>
            <Icon name="x" size={20} />
          </button>
        ) : (
          <button className="dw-btn ghost sm" onClick={() => close(false)}>
            Skip
          </button>
        )}
      </div>
      <div className="hero" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipeX.current = null)}>
        {art}
        <h2 id={titleId} className="dw-display">
          {s.title}
        </h2>
        <p>{s.body}</p>
        <div className="dw-sr-only" aria-live="polite">
          Step {step + 1} of {ONB.length}
        </div>
      </div>
      <div
        style={{
          padding: replay ? '0 24px 26px' : device === 'desktop' ? '0 30px 34px' : '0 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          maxWidth: 460,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="dw-dots">
          {ONB.map((o, i) => (
            <button
              key={i}
              type="button"
              className={'d' + (i === step ? ' on' : '')}
              aria-label={`Go to step ${i + 1}: ${o.title}`}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button ref={backRef} className="dw-btn ghost" style={{ height: 48 }} onClick={() => goTo(step - 1)}>
              <Icon name="chevL" size={18} sw={2.4} />
              Back
            </button>
          )}
          <button ref={primaryRef} className="dw-btn block" style={{ height: 48, flex: 1 }} onClick={next}>
            {last ? (replay ? 'Done' : 'Get started') : 'Next'}
            {!last && <Icon name="chevR" size={18} sw={2.4} />}
          </button>
        </div>
      </div>
    </div>
  );

  if (replay) {
    // Rendered inside AppShell's .dw-app, which already carries theme + device.
    return (
      <div
        className={'dw-onb-overlay' + (closing ? ' closing' : '')}
        onClick={(e) => e.target === e.currentTarget && close(false)}
      >
        {frame}
      </div>
    );
  }

  return (
    <div className="dw-app" data-device={device} data-theme={theme} data-accent="sunrise" data-font="bricolage">
      {frame}
    </div>
  );
}
