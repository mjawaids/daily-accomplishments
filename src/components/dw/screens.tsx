/* DailyWins — Timeline + Insights screens.
   Ported from the Claude Design handoff (app/screens.jsx). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDW } from './useDW';
import type { Device } from './useDevice';
import { Icon, CatGlyph } from './icons';
import { Avatar, DateHead, EntryCard, Kbd, QuickComposer } from './components';
import { isTypingTarget } from './keys';
import {
  computeStreak,
  dayKey,
  entriesThisWeek,
  groupByDay,
  heatCells,
  categoryMix,
  dayKeyTs,
  dayLabel,
  filterWins,
  isoLocal,
  searchTerms,
  shiftDayKey,
  shortDay,
  weekBars,
} from '../../lib/winsData';
import { catColorVar, categoryColor } from '../../lib/categories';
import { Empty } from './screens2';

/** Style carrying a chip's place in the filter row, for the staggered reveal. */
const stagger = (i: number) => ({ '--i': i }) as React.CSSProperties;

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
function firstName(name: string): string {
  return (name || 'there').split(' ')[0];
}

// ---- streak nudge banner: only while today's win is still missing ----
// (once it's logged, the header's StreakPill carries the streak)
function StreakNudge({ streak }: { streak: number }) {
  const atRisk = streak >= 1;
  return (
    <div className="dw-nudge dw-rise">
      <div className="ico">
        <Icon name={atRisk ? 'flame' : 'spark'} size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="t">{atRisk ? `Keep your ${streak}-day streak alive` : 'Log a win to start a streak'}</div>
        <div className="s">{atRisk ? "Log just one win today so it doesn't reset." : 'Even the smallest thing counts.'}</div>
      </div>
    </div>
  );
}

// ---- compact streak count in the header; opens Insights ----
function StreakPill({ streak, device }: { streak: number; device: Device }) {
  const { setScreen } = useDW();
  if (streak < 1) return null;
  const label = `${streak}-day streak`;
  return (
    <button
      className="dw-streak btn"
      title={`${label}. See Insights`}
      aria-label={`${label}. See Insights`}
      onClick={() => setScreen('insights')}
    >
      <Icon name="flame" size={15} style={{ color: 'var(--accent)' }} />
      <span className="n">{device === 'desktop' ? label : streak}</span>
    </button>
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

interface DayChipProps {
  day: string;
  setDay: (d: string | null) => void;
  onPick: () => void;
}

// ---- the chosen day as a chip: previous / change / next / back to any day ----
function DayChip({ day, setDay, onPick }: DayChipProps) {
  const today = isoLocal(new Date());
  const long = dayLabel(dayKeyTs(day));
  return (
    <span className="dw-chip dw-datechip set" style={stagger(0)}>
      <button type="button" className="step" aria-label="Previous day" onClick={() => setDay(shiftDayKey(day, -1))}>
        <Icon name="chevL" size={15} sw={2.4} />
      </button>
      <button type="button" className="lbl" aria-label={`Change date, ${long}`} onClick={onPick}>
        <Icon name="calendar" size={14} sw={2.1} />
        {long.replace(/^(\w{3})\w*/, '$1')}
      </button>
      <button
        type="button"
        className="step"
        aria-label="Next day"
        disabled={day >= today}
        onClick={() => setDay(shiftDayKey(day, 1))}
      >
        <Icon name="chevR" size={15} sw={2.4} />
      </button>
      <button type="button" className="x" aria-label="Any day (clear date)" onClick={() => setDay(null)}>
        <Icon name="x" size={13} sw={2.4} />
      </button>
    </span>
  );
}

interface FilterPanelProps {
  open: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  setQuery: (q: string) => void;
  day: string | null;
  setDay: (d: string | null) => void;
  catIds: string[];
  toggleCat: (id: string) => void;
  /** Escape pressed in an empty search field. */
  onEscape: () => void;
}

// ---- search field + one row of filter chips: date, then categories ----
function FilterPanel({ open, inputRef, query, setQuery, day, setDay, catIds, toggleCat, onEscape }: FilterPanelProps) {
  const { categories } = useDW();
  const dateRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = dateRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };
  return (
    <div id="dw-filterpanel" className={'dw-collapse bleed' + (open ? ' open' : '')}>
      <div>
        <div>
          <div className="dw-filterpanel">
            <div className="dw-searchfield">
              <Icon name="search" size={17} />
              <input
                ref={inputRef}
                type="search"
                value={query}
                placeholder="Search your wins"
                aria-label="Search your wins"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') return;
                  e.preventDefault();
                  if (query) setQuery('');
                  else onEscape();
                }}
              />
              <span className="dw-kbhint dw-kbonly" aria-hidden="true">
                <Kbd>Esc</Kbd>
                {query ? 'to clear' : 'to close'}
              </span>
              {query && (
                <button
                  type="button"
                  className="dw-clearbtn"
                  aria-label="Clear search text"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <Icon name="x" size={15} sw={2.2} />
                </button>
              )}
            </div>
            <div className="dw-filterrow" role="group" aria-label="Filters">
              {day ? (
                <DayChip day={day} setDay={setDay} onPick={openPicker} />
              ) : (
                <button
                  type="button"
                  className="dw-chip dw-datechip"
                  style={stagger(0)}
                  aria-label="Filter by date: any day"
                  onClick={openPicker}
                >
                  <Icon name="calendar" size={15} sw={2} />
                  Any day
                  <Icon name="chevD" size={13} sw={2.4} />
                </button>
              )}
              <span className="sep" style={stagger(1)} />
              {categories.map((c, i) => {
                const on = catIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={'dw-chip selectable' + (on ? ' active' : '')}
                    style={{ ...catColorVar(c), ...stagger(i + 2) }}
                    aria-pressed={on}
                    onClick={() => toggleCat(c.id)}
                  >
                    <CatGlyph cat={c} size={20} />
                    {c.name}
                  </button>
                );
              })}
            </div>
            <input
              ref={dateRef}
              className="dw-datepick"
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              max={isoLocal(new Date())}
              value={day || ''}
              onChange={(e) => setDay(e.target.value || null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================ TIMELINE
export function Timeline({ device }: { device: Device }) {
  const {
    entries,
    prefs,
    visibleDays,
    setVisibleDays,
    setScreen,
    catById,
    categories,
    timelineDay: day,
    setTimelineDay: setDay,
    openAddForDay,
  } = useDW();
  const [query, setQuery] = useState('');
  const [pickedCats, setPickedCats] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A category deleted while selected simply drops out of the filter.
  const catIds = useMemo(
    () => pickedCats.filter((id) => categories.some((c) => c.id === id)),
    [pickedCats, categories]
  );
  const terms = useMemo(() => searchTerms(query), [query]);
  const activeFilters = (terms.length ? 1 : 0) + (catIds.length ? 1 : 0) + (day ? 1 : 0);
  const filtering = activeFilters > 0;
  // The panel only closes on request, so it stays put while filters change;
  // a day set from elsewhere (the Insights heatmap) opens it too.
  const open = panelOpen || filtering;

  const matches = useMemo(
    () => filterWins(entries, { query, day, categoryIds: catIds }, catById),
    [entries, query, day, catIds, catById]
  );
  const groups = useMemo(() => groupByDay(matches), [matches]);
  // While filtering, show every match rather than paginating.
  const shown = filtering ? groups : groups.slice(0, visibleDays);

  const streak = computeStreak(entries);
  const today = isoLocal(new Date());
  const hasToday = entries.some((e) => dayKey(e.ts) === today);

  const focusSearch = () => requestAnimationFrame(() => inputRef.current?.focus());
  const clearFilters = () => {
    setQuery('');
    setPickedCats([]);
    setDay(null);
  };
  const openPanel = () => {
    setPanelOpen(true);
    focusSearch();
  };
  const closePanel = () => {
    clearFilters();
    setPanelOpen(false);
  };
  /** Start over, keeping the panel open and ready to type. */
  const resetFilters = () => {
    clearFilters();
    openPanel();
  };
  const toggleCat = (id: string) => {
    setPanelOpen(true);
    setPickedCats(catIds.includes(id) ? catIds.filter((c) => c !== id) : [...catIds, id]);
  };
  const setDayKeepOpen = (d: string | null) => {
    setPanelOpen(true);
    setDay(d);
  };

  // "/" opens search from anywhere on the Timeline, unless the user is typing.
  const hasEntries = entries.length > 0;
  useEffect(() => {
    if (!hasEntries) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      setPanelOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasEntries]);

  const headRight = (
    <div className="dw-headact">
      {hasEntries && (
        <span className="dw-tipwrap">
          <button
            className={'dw-iconbtn' + (open ? ' active' : '')}
            aria-label={open ? 'Close search and filters' : 'Search and filter'}
            aria-expanded={open}
            aria-controls="dw-filterpanel"
            aria-keyshortcuts="/"
            onClick={open ? closePanel : openPanel}
          >
            <Icon name="search" size={19} />
          </button>
          <span className="dw-tip" role="tooltip">
            {open ? (
              'Close and clear filters'
            ) : (
              <>
                Search &amp; filter <Kbd>/</Kbd>
              </>
            )}
          </span>
        </span>
      )}
      {hasToday && <StreakPill streak={streak} device={device} />}
      {device !== 'desktop' && (
        <button className="dw-iconbtn" aria-label="Profile" title="Profile" onClick={() => setScreen('profile')}>
          <Avatar size={40} />
        </button>
      )}
    </div>
  );

  const summary = [
    `${matches.length} ${matches.length === 1 ? 'win' : 'wins'}`,
    terms.length ? `“${query.trim()}”` : '',
    catIds.map((id) => catById(id).name).join(', '),
    day ? shortDay(dayKeyTs(day)) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={device === 'desktop' ? 'dw-canvas' : undefined}>
      <ScreenHead
        device={device}
        subtitle={`${greeting()}, ${firstName(prefs.name)}`}
        title="Your wins"
        right={headRight}
      />

      <FilterPanel
        open={open}
        inputRef={inputRef}
        query={query}
        setQuery={setQuery}
        day={day}
        setDay={setDayKeepOpen}
        catIds={catIds}
        toggleCat={toggleCat}
        onEscape={() => (filtering ? inputRef.current?.blur() : closePanel())}
      />

      {/* composing and filtering take turns: the composer folds away while the panel is open */}
      <div className={'dw-collapse bleed' + (open ? '' : ' open')}>
        <div>
          <div>
            {!hasToday && (
              <div style={{ marginBottom: 16 }}>
                <StreakNudge streak={streak} />
              </div>
            )}
            <div style={{ marginBottom: 8 }}>
              <QuickComposer />
            </div>
          </div>
        </div>
      </div>

      {filtering && groups.length > 0 && (terms.length > 0 || catIds.length > 0) && (
        <div className="dw-results" aria-live="polite">
          <span className="txt">{summary}</span>
          {activeFilters >= 2 && (
            <button className="dw-clear" onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <Empty />
      ) : groups.length === 0 ? (
        <div className="dw-noresults">
          <Icon name={day && activeFilters === 1 ? 'calendar' : 'search'} size={28} />
          <p>
            {day && activeFilters === 1
              ? `Nothing logged on ${dayLabel(dayKeyTs(day))}.`
              : terms.length > 0 && activeFilters === 1
                ? `No wins match “${query.trim()}”.`
                : 'No wins match these filters.'}
          </p>
          {day && activeFilters === 1 ? (
            <button className="dw-btn sm" onClick={() => openAddForDay(day)}>
              <Icon name="plus" size={16} sw={2.4} />
              {`Log a win for ${shortDay(dayKeyTs(day))}`}
            </button>
          ) : (
            <button className="dw-btn sm ghost" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
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
                    style={{
                      ...catColorVar(catById(e.categoryId)),
                      ...(gi === 0 && i < 3 ? { animationDelay: i * 60 + 'ms' } : {}),
                    }}
                  >
                    <EntryCard entry={e} style="rail" highlight={terms} />
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

          {!filtering && shown.length >= groups.length && groups.length > 3 && (
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
  const { entries, setScreen, categories, jumpToDay } = useDW();
  const streak = computeStreak(entries);
  const thisWeek = entriesThisWeek(entries);
  const total = entries.length;
  const bars = weekBars(entries);
  const maxBar = Math.max(1, ...bars.map((b) => b.count));
  const mix = categoryMix(entries, categories);
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
            <button className="dw-iconbtn" title="Profile" onClick={() => setScreen('profile')}>
              <Avatar size={40} />
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
            <div key={m.category.id} className="m">
              <CatGlyph cat={m.category} size={22} />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  width: device === 'desktop' ? 90 : 74,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={m.category.name}
              >
                {m.category.name}
              </span>
              <div className="track">
                <div
                  className="fill"
                  style={{ width: mounted ? m.pct + '%' : '0%', background: categoryColor(m.category) }}
                />
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
            <button
              key={c.k}
              className="dw-heatcell"
              title={`${c.c} on ${c.k}`}
              aria-label={`${c.c} ${c.c === 1 ? 'win' : 'wins'} on ${dayLabel(dayKeyTs(c.k))}`}
              onClick={() => jumpToDay(c.k)}
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
          <div className="t">{mix[0] && mix[0].count ? `${mix[0].category.name} is your top theme` : 'Start logging to see patterns'}</div>
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
