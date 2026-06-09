/* DailyWins — Timeline + Insights screens.
   Ported from the Claude Design handoff (app/screens.jsx). */
import React, { useEffect, useMemo, useState } from 'react';
import { useDW } from './WinsProvider';
import type { Device } from './useDevice';
import { Icon, CatGlyph } from './icons';
import { Avatar, DateHead, EntryCard, QuickComposer } from './components';
import {
  computeStreak,
  dayKey,
  entriesThisWeek,
  groupByDay,
  heatCells,
  categoryMix,
  isoLocal,
  weekBars,
} from '../../lib/winsData';
import { Empty } from './screens2';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
function firstName(name: string): string {
  return (name || 'there').split(' ')[0];
}

// ---- streak nudge banner ----
function StreakNudge() {
  const { entries } = useDW();
  const streak = computeStreak(entries);
  const today = isoLocal(new Date());
  const hasToday = entries.some((e) => dayKey(e.ts) === today);
  let title: string;
  let sub: string;
  let icon: 'flame' | 'spark';
  if (hasToday && streak > 1) {
    icon = 'flame';
    title = `${streak}-day streak going strong`;
    sub = `You've logged a win ${streak} days in a row. Keep it lit.`;
  } else if (hasToday) {
    icon = 'spark';
    title = 'First win of the day logged';
    sub = 'Nice start — come back tomorrow to build a streak.';
  } else if (streak >= 1) {
    icon = 'flame';
    title = `Keep your ${streak}-day streak alive`;
    sub = "Log just one win today so it doesn't reset.";
  } else {
    icon = 'spark';
    title = 'Log a win to start a streak';
    sub = 'Even the smallest thing counts.';
  }
  return (
    <div className="dw-nudge dw-rise">
      <div className="ico">
        <Icon name={icon} size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
      <div className="dw-streak">
        <Icon name="flame" size={15} style={{ color: 'var(--accent)' }} />
        <span className="n">{streak}</span>
      </div>
    </div>
  );
}

interface ScreenHeadProps {
  device: Device;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

function ScreenHead({ device, title, subtitle, right }: ScreenHeadProps) {
  const big = device === 'desktop';
  return (
    <div className="dw-top" style={big ? { padding: '0 0 18px' } : undefined}>
      <div>
        {subtitle && <div className="greet">{subtitle}</div>}
        <h1 style={big ? { fontSize: 32 } : undefined}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

// ============================================ TIMELINE
export function Timeline({ device }: { device: Device }) {
  const { entries, prefs, visibleDays, setVisibleDays, setScreen } = useDW();

  const groups = useMemo(() => groupByDay(entries), [entries]);
  const shown = groups.slice(0, visibleDays);

  const headRight = (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
      <button className="dw-iconbtn" title="Insights" onClick={() => setScreen('insights')}>
        <Icon name="insights" size={19} />
      </button>
      <button className="dw-iconbtn" title="Profile" onClick={() => setScreen('profile')}>
        <Avatar size={40} />
      </button>
    </div>
  );

  return (
    <div className={device === 'desktop' ? 'dw-canvas' : undefined}>
      <ScreenHead
        device={device}
        subtitle={`${greeting()}, ${firstName(prefs.name)}`}
        title="Your wins"
        right={device === 'desktop' ? null : headRight}
      />

      <div style={{ marginBottom: 16 }}>
        <StreakNudge />
      </div>

      <div style={{ marginBottom: 18 }}>
        <QuickComposer />
      </div>

      {groups.length === 0 ? (
        <Empty />
      ) : (
        <div className="dw-feed" data-style="rail">
          {shown.map((g, gi) => (
            <React.Fragment key={g.key}>
              <DateHead group={g} />
              <div className="dw-rail">
                {g.entries.map((e, i) => (
                  <div
                    key={e.id}
                    className={'dw-node' + (gi === 0 && i < 3 ? ' dw-rise' : '')}
                    data-cat={e.category}
                    style={gi === 0 && i < 3 ? { animationDelay: i * 60 + 'ms' } : undefined}
                  >
                    <EntryCard entry={e} style="rail" />
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}

          {shown.length < groups.length && (
            <div className="dw-loadmore">
              <button onClick={() => setVisibleDays((v) => v + 7)}>
                <Icon name="chevD" size={16} />
                {`Load older — ${groups.length - shown.length} more day${
                  groups.length - shown.length === 1 ? '' : 's'
                }`}
              </button>
            </div>
          )}

          {shown.length >= groups.length && groups.length > 3 && (
            <div className="dw-credit">
              {`That's all ${entries.length} wins. `}
              <br />
              Developed with ❤️ by{' '}
              <a href="https://jawaid.dev" target="_blank" rel="noreferrer">
                Jawaid
              </a>{' '}
              · Powered by 🚀{' '}
              <a href="https://ibexoft.com" target="_blank" rel="noreferrer">
                Ibexoft
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================ INSIGHTS
export function Insights({ device }: { device: Device }) {
  const { entries, setScreen } = useDW();
  const streak = computeStreak(entries);
  const thisWeek = entriesThisWeek(entries);
  const total = entries.length;
  const bars = weekBars(entries);
  const maxBar = Math.max(1, ...bars.map((b) => b.count));
  const mix = categoryMix(entries);
  const cells = heatCells(entries);
  const maxCell = Math.max(1, ...cells.map((c) => c.c));
  const bestDay = bars.reduce((a, b) => (b.count > a.count ? b : a), bars[0] || { count: 0, label: '' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const heatColor = (c: number) =>
    c === 0 ? 'var(--surface-2)' : `color-mix(in oklab, var(--accent) ${20 + (c / maxCell) * 70}%, var(--surface-2))`;

  const statCards: Array<[ 'flame' | 'spark' | 'check' | 'target', number, string, string ]> = [
    ['flame', streak, 'day streak', 'var(--accent)'],
    ['spark', thisWeek, 'this week', 'var(--accent-2)'],
    ['check', total, 'total wins', 'var(--cat-health)'],
    ['target', bestDay.count, `best day (${bestDay.label})`, 'var(--cat-learning)'],
  ];

  return (
    <div className={device === 'desktop' ? 'dw-canvas' : undefined}>
      <ScreenHead
        device={device}
        subtitle="Your momentum"
        title="Insights"
        right={
          device === 'mobile' ? (
            <button className="dw-iconbtn" onClick={() => setScreen('timeline')}>
              <Icon name="home" size={19} />
            </button>
          ) : null
        }
      />

      <div className="dw-statgrid" style={{ marginBottom: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} className="dw-stat dw-rise" style={{ animationDelay: i * 50 + 'ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--surface-2)',
                  color: s[3],
                }}
              >
                <Icon name={s[0]} size={16} sw={2.2} />
              </div>
            </div>
            <div className="v">{s[1]}</div>
            <div className="k">{s[2]}</div>
          </div>
        ))}
      </div>

      <div className="dw-stat" style={{ marginBottom: 16 }}>
        <div className="dw-section-label">Last 7 days</div>
        <div className="dw-bars">
          {bars.map((b, i) => (
            <div key={i} className={'bar' + (b.count === maxBar && b.count > 0 ? ' peak' : '')}>
              <span className="val" style={{ opacity: b.count ? 1 : 0.35 }}>
                {b.count}
              </span>
              <div className="col" style={{ height: mounted ? Math.max(6, (b.count / maxBar) * 100) + '%' : '6px' }} />
              <span className="lab" style={b.isToday ? { color: 'var(--accent)' } : undefined}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="dw-stat" style={{ marginBottom: 16 }}>
        <div className="dw-section-label">Category mix</div>
        <div className="dw-mix">
          {mix.map((m) => (
            <div key={m.id} className="m">
              <CatGlyph cat={m.id} size={22} />
              <span style={{ fontSize: 13.5, fontWeight: 600, width: device === 'desktop' ? 90 : 74 }}>{m.label}</span>
              <div className="track">
                <div className="fill" style={{ width: mounted ? m.pct + '%' : '0%', background: `var(--cat-${m.id})` }} />
              </div>
              <span className="pct">{m.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dw-stat" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
          <div className="dw-section-label" style={{ margin: 0 }}>
            Activity — last 12 weeks
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>less → more</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 4,
            gridAutoFlow: 'column',
            gridTemplateRows: 'repeat(7,1fr)',
          }}
        >
          {cells.map((c, i) => (
            <div
              key={c.k}
              title={`${c.c} on ${c.k}`}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: mounted ? heatColor(c.c) : 'var(--surface-2)',
                transition: `background .5s ${(i % 12) * 20}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="dw-nudge">
        <div className="ico">
          <Icon name="spark" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="t">{mix[0] && mix[0].count ? `${mix[0].label} is your top theme` : 'Start logging to see patterns'}</div>
          <div className="s">
            {mix[0] && mix[0].count
              ? `${mix[0].pct}% of your wins. A balanced week mixes work with health & personal.`
              : 'Your trends will appear here.'}
          </div>
        </div>
      </div>
    </div>
  );
}
