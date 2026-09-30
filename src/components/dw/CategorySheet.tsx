/* DailyWins — add / edit / delete a category (bottom sheet, opened from Profile).
   Deleting a category that still has wins asks where to move them: every win
   keeps a category, and the last category cannot be deleted. */
import { useState } from 'react';
import { useDW } from './useDW';
import { CatGlyph, Icon } from './icons';
import { Sheet } from './components';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  MAX_NAME_LENGTH,
  catColorVar,
  categoryColor,
  validateCategoryName,
} from '../../lib/categories';
import type { Category, CategoryColor, CategoryIcon } from '../../lib/categories';

const TITLE_ID = 'dw-cat-title';

const COLOR_NAMES: Record<CategoryColor, string> = {
  blue: 'Blue',
  rose: 'Rose',
  violet: 'Violet',
  green: 'Green',
  amber: 'Amber',
  teal: 'Teal',
  orange: 'Orange',
  slate: 'Slate',
};

/** Spoken names for the icon picker (the keys are code names like heartHand). */
const ICON_NAMES: Partial<Record<CategoryIcon, string>> = {
  briefcase: 'Briefcase',
  heartHand: 'Heart',
  book: 'Book',
  activity: 'Pulse',
  star: 'Star',
  target: 'Target',
  flame: 'Flame',
  spark: 'Sparkle',
  flag: 'Flag',
  home: 'Home',
  user: 'Person',
  calendar: 'Calendar',
  chart: 'Chart',
  clock: 'Clock',
  mail: 'Mail',
  image: 'Image',
};

function CategoryForm({ editing, onDone }: { editing: Category | null; onDone: () => void }) {
  const { categories, entries, catById, addCategory, editCategory, removeCategory } = useDW();
  const [name, setName] = useState(editing ? editing.name : '');
  const [color, setColor] = useState<CategoryColor>(
    editing ? editing.color : CATEGORY_COLORS.find((c) => !categories.some((x) => x.color === c)) || 'blue'
  );
  const [icon, setIcon] = useState<CategoryIcon>(editing ? editing.icon : 'star');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const others = editing ? categories.filter((c) => c.id !== editing.id) : [];
  const [moveTo, setMoveTo] = useState<string>(others[0]?.id || '');
  const winCount = editing ? entries.filter((e) => catById(e.categoryId).id === editing.id).length : 0;

  const error = validateCategoryName(name, categories, editing?.id);
  const preview = { color, icon };

  const save = async () => {
    setTouched(true);
    if (error || busy) return;
    setBusy(true);
    const ok = editing ? await editCategory(editing.id, { name, color, icon }) : await addCategory({ name, color, icon });
    setBusy(false);
    if (ok) onDone();
  };

  const doDelete = async () => {
    if (!editing || !moveTo || busy) return;
    setBusy(true);
    const ok = await removeCategory(editing.id, moveTo);
    setBusy(false);
    if (ok) onDone();
  };

  if (editing && confirmDelete) {
    return (
      <div>
        <h3 id={TITLE_ID}>Delete “{editing.name}”?</h3>
        {winCount > 0 ? (
          <>
            <p className="dw-danger-note" id="dw-cat-move-label">
              {winCount === 1 ? '1 win is' : `${winCount} wins are`} in this category. Choose where to move{' '}
              {winCount === 1 ? 'it' : 'them'}:
            </p>
            <div className="dw-field">
              <div className="dw-catpick" role="group" aria-labelledby="dw-cat-move-label">
                {others.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={'dw-chip selectable' + (moveTo === c.id ? ' active' : '')}
                    style={catColorVar(c)}
                    aria-pressed={moveTo === c.id}
                    onClick={() => setMoveTo(c.id)}
                  >
                    <CatGlyph cat={c} size={20} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="dw-danger-note">There are no wins in this category. This can’t be undone.</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="dw-btn ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
            Cancel
          </button>
          <button
            className="dw-btn block danger"
            onClick={doDelete}
            disabled={busy || !moveTo}
          >
            <Icon name="trash" size={17} />
            {winCount > 0 ? 'Move wins & delete' : 'Delete category'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 id={TITLE_ID}>{editing ? 'Edit category' : 'New category'}</h3>
      <div className="dw-field">
        <label htmlFor="dw-cat-name">Name</label>
        <div className="dw-inputrow">
          <CatGlyph cat={preview} size={24} />
          <input
            id="dw-cat-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g. Side project"
            autoFocus
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? 'dw-cat-name-error' : undefined}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
        </div>
        {touched && error && (
          <div className="dw-field-error" id="dw-cat-name-error">
            {error}
          </div>
        )}
      </div>
      <div className="dw-field">
        <label id="dw-cat-color-label">Color</label>
        <div className="dw-swatches" role="group" aria-labelledby="dw-cat-color-label">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={COLOR_NAMES[c]}
              aria-pressed={color === c}
              title={COLOR_NAMES[c]}
              className={'dw-swatch' + (color === c ? ' active' : '')}
              style={{ background: categoryColor({ color: c }) }}
              onClick={() => setColor(c)}
            >
              {color === c && <Icon name="check" size={16} sw={2.6} />}
            </button>
          ))}
        </div>
      </div>
      <div className="dw-field">
        <label id="dw-cat-icon-label">Icon</label>
        <div className="dw-icongrid" style={catColorVar(preview)} role="group" aria-labelledby="dw-cat-icon-label">
          {CATEGORY_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={ICON_NAMES[i] ?? i}
              aria-pressed={icon === i}
              className={'dw-iconpick' + (icon === i ? ' active' : '')}
              onClick={() => setIcon(i)}
            >
              <Icon name={i} size={18} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {editing && (
          <button
            className="dw-btn ghost danger-text"
            disabled={busy || others.length === 0}
            title={others.length === 0 ? 'You need at least one category' : undefined}
            onClick={() => setConfirmDelete(true)}
          >
            <Icon name="trash" size={17} />
            Delete
          </button>
        )}
        <button className="dw-btn block" disabled={busy || (touched && !!error)} onClick={save}>
          <Icon name="check" size={17} sw={2.5} />
          {editing ? 'Save changes' : 'Add category'}
        </button>
      </div>
      {editing && others.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          This is your only category, so it can’t be deleted.
        </div>
      )}
    </div>
  );
}

export function CategorySheet() {
  const { categorySheet, setCategorySheet, categories } = useDW();
  if (!categorySheet) return null;
  const editing = categorySheet.mode === 'edit' ? categories.find((c) => c.id === categorySheet.id) || null : null;
  if (categorySheet.mode === 'edit' && !editing) return null;
  const close = () => setCategorySheet(null);
  return (
    <Sheet labelledBy={TITLE_ID} onClose={close} style={{ maxHeight: '92%', overflowY: 'auto' }}>
      <CategoryForm key={editing?.id || 'new'} editing={editing} onDone={close} />
    </Sheet>
  );
}
