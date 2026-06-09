/* DailyWins — shared UI components (entry card, composer, form, chips).
   Ported from the Claude Design handoff (app/components.jsx); favorites removed. */
import React, { useEffect, useRef, useState } from 'react';
import { useDW } from './WinsProvider';
import { Icon, CatGlyph } from './icons';
import { CATEGORY_KEYS, CATS, isoLocal, timeLabel } from '../../lib/winsData';
import type { Category, DayGroup, Win } from '../../lib/winsData';
import { relativeDay, dayLabel, shortDay } from '../../lib/winsData';

export function Avatar({ size = 34 }: { size?: number }) {
  const { prefs, avatarUrl } = useDW();
  const initials = prefs.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
  return (
    <div className="av" style={{ width: size, height: size, fontSize: size * 0.4, overflow: 'hidden' }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}

interface CatPickerProps {
  value: Category;
  onChange: (c: Category) => void;
  small?: boolean;
}

export function CatPicker({ value, onChange, small }: CatPickerProps) {
  return (
    <div className="dw-catpick">
      {CATEGORY_KEYS.map((c) => (
        <button
          key={c}
          type="button"
          className={'dw-chip selectable' + (small ? ' sm' : '') + (value === c ? ' active' : '')}
          data-cat={c}
          onClick={() => onChange(c)}
        >
          <CatGlyph cat={c} size={small ? 17 : 20} />
          {CATS[c].label}
        </button>
      ))}
    </div>
  );
}

export function CatTag({ cat, small }: { cat: Category; small?: boolean }) {
  return (
    <span className={'dw-chip' + (small ? ' sm' : '')} data-cat={cat}>
      <CatGlyph cat={cat} size={small ? 17 : 20} />
      {CATS[cat].label}
    </span>
  );
}

interface EntryCardProps {
  entry: Win;
  style?: 'rail' | 'cards' | 'compact';
}

export function EntryCard({ entry, style }: EntryCardProps) {
  const { startEdit } = useDW();

  if (style === 'compact') {
    return (
      <div className="dw-card" onClick={() => startEdit(entry)}>
        <span className="dot" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="c-top">
            <span className="c-time">{timeLabel(entry.ts)}</span>
            <CatTag cat={entry.category} small />
          </div>
          <div className="c-body" style={{ fontSize: 14 }}>
            {entry.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dw-card" onClick={() => startEdit(entry)}>
      <div className="c-top">
        <CatTag cat={entry.category} small />
        <span className="c-time">{timeLabel(entry.ts)}</span>
      </div>
      <div className="c-body">{entry.text}</div>
      <div className="c-acts">
        <button
          className="c-act"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            startEdit(entry);
          }}
        >
          <Icon name="edit" size={15} />
        </button>
      </div>
    </div>
  );
}

export function DateHead({ group }: { group: DayGroup }) {
  const rel = relativeDay(group.ts);
  return (
    <div className="dw-datehead">
      <span className="d-day">{rel || dayLabel(group.ts)}</span>
      {rel && <span className="d-rel">{shortDay(group.ts)}</span>}
      <span className="d-count">{group.entries.length + (group.entries.length === 1 ? ' win' : ' wins')}</span>
      <span className="line" />
    </div>
  );
}

// ---- inline quick composer (default add pattern) ----
export function QuickComposer() {
  const { addWin, openAdd } = useDW();
  const [text, setText] = useState('');
  const [cat, setCat] = useState<Category>('work');
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
    if (!text.trim()) return;
    addWin({ text, category: cat });
    setText('');
    setFocused(false);
    taRef.current?.blur();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
  };

  return (
    <div className={'dw-composer' + (focused ? ' focused' : '')}>
      <div className="row1">
        <Avatar size={34} />
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          placeholder="What did you get done today?"
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
            onClick={() => openAdd()}
          >
            <Icon name="calendar" size={18} />
          </button>
          <button className="dw-btn sm" disabled={!text.trim()} onClick={submit}>
            <Icon name="check" size={16} sw={2.6} />
            Log win
          </button>
        </div>
      )}
    </div>
  );
}

// ---- full entry form (used in sheet + fullscreen + edit) ----
export function EntryForm({ onDone }: { onDone: () => void }) {
  const { editing, addWin, updateWin, deleteWin } = useDW();
  const isEdit = !!editing;
  const [text, setText] = useState(editing ? editing.text : '');
  const [cat, setCat] = useState<Category>(editing ? editing.category : 'work');
  const [dateStr, setDateStr] = useState(isoLocal(new Date(editing ? editing.ts : Date.now())));
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
    if (!text.trim()) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const base = new Date(editing ? editing.ts : Date.now());
    base.setFullYear(y, m - 1, d);
    if (!isEdit) base.setHours(new Date().getHours(), new Date().getMinutes());
    if (isEdit && editing) {
      updateWin(editing.id, { text: text.trim(), category: cat, ts: base.getTime() });
    } else {
      addWin({ text, category: cat, ts: base.getTime() });
    }
    onDone();
  };

  return (
    <div>
      <h3>{isEdit ? 'Edit win' : 'Log a win'}</h3>
      <div className="dw-field">
        <label>What did you accomplish?</label>
        <textarea
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
        <label>Category</label>
        <CatPicker value={cat} onChange={setCat} />
      </div>
      <div className="dw-field">
        <label>Date</label>
        <div className="dw-inputrow">
          <Icon name="calendar" size={18} />
          <input type="date" value={dateStr} max={isoLocal(new Date())} onChange={(e) => setDateStr(e.target.value)} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Back-date to log a win you missed.</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {isEdit && editing && (
          <button
            className="dw-btn ghost"
            style={{ color: 'var(--cat-personal)' }}
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
