/* DailyWins — shared UI components (entry card, composer, form, chips).
   Ported from the Claude Design handoff (app/components.jsx); favorites removed. */
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDW } from './useDW';
import { Icon, CatGlyph } from './icons';
import { highlightParts, isoLocal, timeLabel } from '../../lib/winsData';
import type { DayGroup, Win } from '../../lib/winsData';
import { catColorVar } from '../../lib/categories';
import { relativeDay, dayLabel, shortDay } from '../../lib/winsData';
import { IS_MAC } from './keys';

/** A key cap, for keyboard-shortcut hints. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="dw-kbd">{children}</kbd>;
}

/** Initials or photo. Decorative: the control around it carries the name. */
export function Avatar({ size = 34 }: { size?: number }) {
  const { prefs, avatarUrl } = useDW();
  const initials = prefs.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
  return (
    <div className="av" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.4, overflow: 'hidden' }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}

/** The picker's selection, falling back to the first category when the chosen
    one is gone (deleted elsewhere) or the list only just loaded. */
function useCatSelection(initial: string | null): [string, (id: string) => void] {
  const { categories, catById } = useDW();
  const [picked, setPicked] = useState<string | null>(initial);
  const resolved = picked ? catById(picked).id : '';
  const valid = categories.some((c) => c.id === resolved);
  return [valid ? resolved : categories[0]?.id || '', setPicked];
}

interface CatPickerProps {
  value: string;
  onChange: (id: string) => void;
  small?: boolean;
  /** Id of the element that labels the group. */
  labelledBy?: string;
}

export function CatPicker({ value, onChange, small, labelledBy }: CatPickerProps) {
  const { categories } = useDW();
  return (
    <div className="dw-catpick" role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Category'}>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={'dw-chip selectable' + (small ? ' sm' : '') + (value === c.id ? ' active' : '')}
          style={catColorVar(c)}
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
        >
          <CatGlyph cat={c} size={small ? 17 : 20} />
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function CatTag({ categoryId, small }: { categoryId: string; small?: boolean }) {
  const { catById } = useDW();
  const cat = catById(categoryId);
  return (
    <span className={'dw-chip' + (small ? ' sm' : '')} style={catColorVar(cat)}>
      <CatGlyph cat={cat} size={small ? 17 : 20} />
      {cat.name}
    </span>
  );
}

/** `text` with any of the (folded) search `terms` wrapped in <mark>. */
function Highlighted({ text, terms }: { text: string; terms?: string[] }) {
  if (!terms || !terms.length) return <>{text}</>;
  return (
    <>
      {highlightParts(text, terms).map((p, i) => (p.match ? <mark key={i}>{p.text}</mark> : p.text))}
    </>
  );
}

interface EntryCardProps {
  entry: Win;
  style?: 'rail' | 'cards' | 'compact';
  /** Search terms to highlight in the text (see searchTerms()). */
  highlight?: string[];
}

export function EntryCard({ entry, style, highlight }: EntryCardProps) {
  const { startEdit } = useDW();
  // The whole card is a mouse/touch shortcut; the Edit button is the real,
  // named control for keyboard and screen-reader users.
  const editLabel = `Edit win: ${entry.text.length > 60 ? entry.text.slice(0, 57) + '…' : entry.text}`;
  const editButton = (
    <div className="c-acts">
      <button
        type="button"
        className="c-act"
        aria-label={editLabel}
        onClick={(e) => {
          e.stopPropagation();
          startEdit(entry);
        }}
      >
        <Icon name="edit" size={15} />
      </button>
    </div>
  );

  if (style === 'compact') {
    return (
      <div className="dw-card" onClick={() => startEdit(entry)}>
        <span className="dot" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="c-top">
            <span className="c-time">{timeLabel(entry.ts)}</span>
            <CatTag categoryId={entry.categoryId} small />
          </div>
          <div className="c-body" style={{ fontSize: 14 }}>
            <Highlighted text={entry.text} terms={highlight} />
          </div>
        </div>
        {editButton}
      </div>
    );
  }

  return (
    <div className="dw-card" onClick={() => startEdit(entry)}>
      <div className="c-top">
        <CatTag categoryId={entry.categoryId} small />
        <span className="c-time">{timeLabel(entry.ts)}</span>
      </div>
      <div className="c-body">
        <Highlighted text={entry.text} terms={highlight} />
      </div>
      {editButton}
    </div>
  );
}

export function DateHead({ group }: { group: DayGroup }) {
  const rel = relativeDay(group.ts);
  return (
    <h2 className="dw-datehead">
      <span className="d-day">{rel || dayLabel(group.ts)}</span>
      {rel && <span className="d-rel">{shortDay(group.ts)}</span>}
      <span className="d-count">{group.entries.length + (group.entries.length === 1 ? ' win' : ' wins')}</span>
      <span className="line" aria-hidden="true" />
    </h2>
  );
}

// ---- inline quick composer (default add pattern) ----
export function QuickComposer() {
  const { addWin, openAdd } = useDW();
  const [text, setText] = useState('');
  const [cat, setCat] = useCatSelection(null);
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };
  useEffect(() => {
    autosize(taRef.current);
  }, [text]);

  const submit = () => {
    if (!text.trim() || !cat) return;
    addWin({ text, categoryId: cat });
    setText('');
    setFocused(false);
    taRef.current?.blur();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
  };

  return (
    <div className={'dw-composer' + (focused ? ' focused' : '') + (focused || text ? ' open' : '')}>
      <div className="row1">
        <Avatar size={34} />
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          placeholder="What did you get done today?"
          aria-label="What did you get done today?"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKey}
        />
      </div>
      {(focused || text) && (
        <div className="tools" style={{ animation: 'dw-rise .25s' }}>
          <CatPicker value={cat} onChange={setCat} small />
          <span className="spacer" />
          <button
            className="dw-iconbtn"
            style={{ width: 36, height: 36, borderRadius: 11 }}
            title="More options (date, etc.)"
            aria-label="More options (date, etc.)"
            onClick={() => openAdd()}
          >
            <Icon name="calendar" size={18} />
          </button>
          <span className="dw-kbhint dw-kbonly" aria-hidden="true">
            <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <button
            className="dw-btn sm"
            disabled={!text.trim()}
            onClick={submit}
            aria-keyshortcuts={IS_MAC ? 'Meta+Enter' : 'Control+Enter'}
          >
            <Icon name="check" size={16} sw={2.6} />
            Log win
          </button>
        </div>
      )}
    </div>
  );
}

// ---- full entry form (used in sheet + fullscreen + edit) ----
export function EntryForm({ onDone, titleId }: { onDone: () => void; titleId?: string }) {
  const { editing, addDay, addWin, updateWin, deleteWin } = useDW();
  const isEdit = !!editing;
  const ids = useId();
  const [text, setText] = useState(editing ? editing.text : '');
  const [cat, setCat] = useCatSelection(editing ? editing.categoryId : null);
  const [dateStr, setDateStr] = useState(editing ? isoLocal(new Date(editing.ts)) : addDay || isoLocal(new Date()));
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (el) {
      el.focus();
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, []);

  const save = () => {
    if (!text.trim() || !cat) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const base = new Date(editing ? editing.ts : Date.now());
    base.setFullYear(y, m - 1, d);
    if (!isEdit) base.setHours(new Date().getHours(), new Date().getMinutes());
    if (isEdit && editing) {
      updateWin(editing.id, { text: text.trim(), categoryId: cat, ts: base.getTime() });
    } else {
      addWin({ text, categoryId: cat, ts: base.getTime() });
    }
    onDone();
  };

  return (
    <div>
      <h3 id={titleId ?? `${ids}-title`}>{isEdit ? 'Edit win' : 'Log a win'}</h3>
      <div className="dw-field">
        <label htmlFor={`${ids}-text`}>What did you accomplish?</label>
        <textarea
          id={`${ids}-text`}
          ref={taRef}
          className="dw-input"
          value={text}
          placeholder="Describe the win in your own words…"
          onChange={(e) => {
            setText(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          }}
        />
      </div>
      <div className="dw-field">
        <label id={`${ids}-cat`}>Category</label>
        <CatPicker value={cat} onChange={setCat} labelledBy={`${ids}-cat`} />
      </div>
      <div className="dw-field">
        <label htmlFor={`${ids}-date`}>Date</label>
        <div className="dw-inputrow">
          <Icon name="calendar" size={18} />
          <input
            id={`${ids}-date`}
            type="date"
            value={dateStr}
            max={isoLocal(new Date())}
            aria-describedby={`${ids}-date-hint`}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
        <div id={`${ids}-date-hint`} style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
          Back-date to log a win you missed.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {isEdit && editing && (
          <button
            className="dw-btn ghost danger-text"
            onClick={() => {
              deleteWin(editing.id);
              onDone();
            }}
          >
            <Icon name="trash" size={17} />
            Delete
          </button>
        )}
        <button className="dw-btn block" disabled={!text.trim()} onClick={save}>
          <Icon name="check" size={17} sw={2.5} />
          {isEdit ? 'Save changes' : 'Log win'}
        </button>
      </div>
    </div>
  );
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SheetProps {
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** Bottom sheet (a centered card on desktop) as a modal dialog: Esc and the
    close button dismiss it, Tab stays inside, and focus goes back to whatever
    opened it. */
export function Sheet({ labelledBy, onClose, children, style }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Captured during the first render, before a child's autofocus moves focus.
  const [returnTo] = useState(() => (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null));

  useEffect(() => {
    const el = ref.current;
    // Let an autofocused field keep focus; otherwise start on the dialog.
    if (el && !el.contains(document.activeElement)) el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (!el) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === el || !el.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !el.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (returnTo && returnTo !== document.body && document.contains(returnTo)) returnTo.focus();
    };
  }, [returnTo]);

  const sheet = (
    <div className="dw-scrim" onClick={onClose}>
      <div
        ref={ref}
        className="dw-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dw-grab" aria-hidden="true" />
        <button type="button" className="dw-iconbtn dw-sheetclose" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
        {children}
      </div>
    </div>
  );
  // Always cover the whole app, even when opened from inside a scrolling screen.
  const host = typeof document !== 'undefined' ? document.querySelector('.dw-app') : null;
  return host ? createPortal(sheet, host) : sheet;
}

// ---- load error: the wins couldn't be fetched from the server ----
export function LoadErrorBanner() {
  const { loadError, retryLoad, entries } = useDW();
  const [retrying, setRetrying] = useState(false);
  if (!loadError) return null;
  const retry = async () => {
    setRetrying(true);
    await Promise.resolve(retryLoad());
    setRetrying(false);
  };
  return (
    <div className="dw-banner" role="alert">
      <div className="ico">
        <Icon name="alert" size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">Couldn't load your wins</div>
        <div className="s">
          {entries.length
            ? 'Showing the wins saved on this device. Check your connection and try again.'
            : 'Your wins are safe. Check your connection and try again.'}
        </div>
      </div>
      <button className="dw-btn sm ghost" onClick={retry} disabled={retrying}>
        {retrying ? 'Trying…' : 'Try again'}
      </button>
    </div>
  );
}
