import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// categories.ts imports the Supabase client, which throws without env vars.
vi.mock('./supabase', () => ({ supabase: {} }));

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORIES,
  categoryWriteFields,
  legacyCategoryId,
  resolveCategory,
  validateCategoryName,
} from './categories';
import type { Category } from './categories';
import { categoryMix, toWin } from './winsData';

const work: Category = { id: 'c-work', name: 'Work', color: 'blue', icon: 'briefcase', position: 0, legacy_key: 'work' };
const side: Category = { id: 'c-side', name: 'Side project', color: 'amber', icon: 'star', position: 1, legacy_key: null };
const cats = [work, side];

describe('resolveCategory', () => {
  it('finds a category by id', () => {
    expect(resolveCategory(cats, 'c-side')).toBe(side);
  });

  it('maps legacy ids onto the user row with that legacy_key', () => {
    expect(resolveCategory(cats, legacyCategoryId('work'))).toBe(work);
  });

  it('falls back to the default when the user row is not known', () => {
    expect(resolveCategory([], legacyCategoryId('health')).name).toBe('Health');
  });

  it('returns a placeholder for unknown ids', () => {
    expect(resolveCategory(cats, 'nope').name).toBe('Uncategorized');
  });
});

describe('categoryWriteFields', () => {
  it('writes category_id for real categories', () => {
    expect(categoryWriteFields('c-side')).toEqual({ category_id: 'c-side' });
  });

  it('writes the legacy text column for placeholder defaults', () => {
    expect(categoryWriteFields(DEFAULT_CATEGORIES[3].id)).toEqual({ category: 'health' });
  });
});

describe('validateCategoryName', () => {
  it('rejects empty, too long, and duplicate names (case-insensitive)', () => {
    expect(validateCategoryName('   ', cats)).not.toBeNull();
    expect(validateCategoryName('x'.repeat(25), cats)).not.toBeNull();
    expect(validateCategoryName(' work ', cats)).not.toBeNull();
  });

  it('allows keeping the current name when editing', () => {
    expect(validateCategoryName('Work', cats, 'c-work')).toBeNull();
    expect(validateCategoryName('Reading', cats)).toBeNull();
  });
});

describe('toWin + categoryMix', () => {
  const row = (id: string, category_id: string | null, category: 'work' | null) => ({
    id,
    user_id: 'u',
    text: 't',
    category_id: category_id as string,
    category,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  it('counts wins per user category, including legacy cached rows', () => {
    const wins = [row('1', 'c-side', null), row('2', 'c-work', 'work'), row('3', null, 'work')].map(toWin);
    expect(wins[2].categoryId).toBe(legacyCategoryId('work'));
    const mix = categoryMix(wins, cats);
    expect(mix.map((m) => [m.category.id, m.count, m.pct])).toEqual([
      ['c-work', 2, 67],
      ['c-side', 1, 33],
    ]);
  });

  it('hides categories with no wins', () => {
    const mix = categoryMix([row('1', 'c-side', null)].map(toWin), cats);
    expect(mix.map((m) => m.category.id)).toEqual(['c-side']);
  });

  it('lists every category at 0% when there are no wins', () => {
    expect(categoryMix([], cats).map((m) => [m.category.id, m.pct])).toEqual([
      ['c-work', 0],
      ['c-side', 0],
    ]);
  });

  it('gives unresolvable wins their own row so percentages add up', () => {
    const mix = categoryMix([row('1', 'c-work', 'work'), row('2', 'gone', null)].map(toWin), cats);
    expect(mix.map((m) => [m.category.name, m.pct])).toEqual([
      ['Work', 50],
      ['Uncategorized', 50],
    ]);
  });
});

describe('migration parity', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/20260929120000_user_categories.sql'),
    'utf8'
  );
  const list = (column: string) => {
    const m = sql.match(new RegExp(`${column}\\s+text not null check \\(${column} in \\(([^)]*)\\)\\)`));
    if (!m) throw new Error(`no check list for ${column}`);
    return m[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  };

  it('allows exactly the colors and icons the UI offers', () => {
    expect(list('color')).toEqual([...CATEGORY_COLORS]);
    expect(list('icon')).toEqual([...CATEGORY_ICONS]);
  });

  it('seeds the same defaults as DEFAULT_CATEGORIES', () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(sql).toContain(`'${c.name}',`);
      expect(sql).toMatch(new RegExp(`'${c.name}',\\s+'${c.color}',\\s+'${c.icon}',\\s+${c.position}, '${c.legacy_key}'`));
    }
  });
});
