/* DailyWins — 3-step onboarding carousel, shown once after signup.
   Ported from the Claude Design handoff (app/screens2.jsx). Standalone frame. */
import { useState } from 'react';
import { Icon, Logo, CatGlyph } from './icons';
import type { IconName } from './icons';
import { CATS } from '../../lib/winsData';
import type { Category } from '../../lib/winsData';
import { useDevice, useResolvedTheme, getStoredTheme } from './useDevice';

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

export function Onboarding({ onDone }: { onDone: () => void }) {
  const device = useDevice();
  const theme = useResolvedTheme(getStoredTheme());
  const [step, setStep] = useState(0);
  const s = ONB[step];
  const last = step === ONB.length - 1;
  const next = () => (last ? onDone() : setStep(step + 1));

  const chipCats: Category[] = ['work', 'health', 'learning'];
  const barCats: Category[] = ['work', 'health', 'personal'];

  const art = (
    <div
      className="art"
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
              top: [20, 140, 30][i],
              left: [16, 24, 130][i],
              animationDelay: i * 90 + 120 + 'ms',
              boxShadow: 'var(--shadow-sm)',
            }}
            data-cat={chipCats[i]}
          >
            <CatGlyph cat={chipCats[i]} size={17} />
            {CATS[chipCats[i]].label}
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
              background: `var(--cat-${barCats[i]})`,
              animationDelay: i * 100 + 120 + 'ms',
              opacity: 0.8,
            }}
          />
        ))}
    </div>
  );

  return (
    <div className="dw-app" data-device={device} data-theme={theme} data-accent="sunrise" data-font="bricolage">
      <div className="dw-onb">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: device === 'desktop' ? '26px 30px 0' : '46px 22px 0',
          }}
        >
          <Logo size={30} fontSize={19} />
          <button className="dw-btn ghost sm" onClick={onDone}>
            Skip
          </button>
        </div>
        <div className="hero">
          {art}
          <h2 className="dw-display">{s.title}</h2>
          <p>{s.body}</p>
        </div>
        <div
          style={{
            padding: device === 'desktop' ? '0 30px 34px' : '0 24px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            maxWidth: 460,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div className="dw-dots">
            {ONB.map((_, i) => (
              <span key={i} className={'d' + (i === step ? ' on' : '')} />
            ))}
          </div>
          <button className="dw-btn block" style={{ height: 48 }} onClick={next}>
            {last ? 'Get started' : 'Next'}
            {!last && <Icon name="chevR" size={18} sw={2.4} />}
          </button>
        </div>
      </div>
    </div>
  );
}
