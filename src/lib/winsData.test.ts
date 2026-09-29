import { describe, expect, it, vi } from 'vitest';

// winsData.ts imports categories.ts, which imports the Supabase client.
vi.mock('./supabase', () => ({ supabase: {} }));

import { legacyCategoryId, resolveCategory } from './categories';
import type { Category } from './categories';
import { dayKey, dayKeyTs, filterWins, highlightParts, searchTerms, shiftDayKey } from './winsData';
import type { Win } from './winsData';

const names: Record<string, string> = { w: 'Work', h: 'Health' };
const catName = (id: string) => ({ id, name: names[id] || 'Uncategorized' });

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const wins: Win[] = [
  { id: '1', text: 'Shipped the Search feature', categoryId: 'w', ts: at(2026, 9, 28, 9) },
  { id: '2', text: 'Ran 5k before work', categoryId: 'h', ts: at(2026, 9, 28, 18) },
  { id: '3', text: 'Coffee chat at the Café', categoryId: 'w', ts: at(2026, 9, 27) },
];
const ids = (list: Win[]) => list.map((w) => w.id);

describe('searchTerms', () => {
  it('splits, lower-cases and strips accents', () => {
    expect(searchTerms('  Café   SEARCH ')).toEqual(['cafe', 'search']);
    expect(searchTerms('   ')).toEqual([]);
  });
});

describe('filterWins', () => {
  it('keeps everything for an empty filter', () => {
    expect(filterWins(wins, {}, catName)).toBe(wins);
    expect(filterWins(wins, { query: '  ', day: null }, catName)).toBe(wins);
  });

  it('matches case-insensitively and ignores accents both ways', () => {
    expect(ids(filterWins(wins, { query: 'search' }, catName))).toEqual(['1']);
    expect(ids(filterWins(wins, { query: 'cafe' }, catName))).toEqual(['3']);
    expect(ids(filterWins(wins, { query: 'CAFÉ' }, catName))).toEqual(['3']);
  });

  it('requires every term to match', () => {
    expect(ids(filterWins(wins, { query: 'work ran' }, catName))).toEqual(['2']);
    expect(ids(filterWins(wins, { query: 'shipped coffee' }, catName))).toEqual([]);
  });

  it('matches the category name', () => {
    expect(ids(filterWins(wins, { query: 'health' }, catName))).toEqual(['2']);
    expect(ids(filterWins(wins, { query: 'work' }, catName))).toEqual(['1', '2', '3']);
  });

  it('restricts to one local day', () => {
    expect(ids(filterWins(wins, { day: dayKey(at(2026, 9, 28)) }, catName))).toEqual(['1', '2']);
    expect(ids(filterWins(wins, { day: '2026-01-01' }, catName))).toEqual([]);
  });

  it('combines a query with a day', () => {
    expect(ids(filterWins(wins, { query: 'work', day: '2026-09-27' }, catName))).toEqual(['3']);
  });

  it('keeps everything for an empty category list', () => {
    expect(filterWins(wins, { categoryIds: [] }, catName)).toBe(wins);
  });

  it('restricts to any of the selected categories', () => {
    expect(ids(filterWins(wins, { categoryIds: ['h'] }, catName))).toEqual(['2']);
    expect(ids(filterWins(wins, { categoryIds: ['w', 'h'] }, catName))).toEqual(['1', '2', '3']);
    expect(ids(filterWins(wins, { categoryIds: ['gone'] }, catName))).toEqual([]);
  });

  it('combines a query, categories and a day', () => {
    expect(ids(filterWins(wins, { query: 'coffee', categoryIds: ['w'], day: '2026-09-27' }, catName))).toEqual(['3']);
    expect(ids(filterWins(wins, { query: 'coffee', categoryIds: ['h'], day: '2026-09-27' }, catName))).toEqual([]);
    expect(ids(filterWins(wins, { categoryIds: ['w'], day: dayKey(at(2026, 9, 28)) }, catName))).toEqual(['1']);
  });
});

describe('filterWins with real categories', () => {
  const work: Category = { id: 'c-work', name: 'Work', color: 'blue', icon: 'briefcase', position: 0, legacy_key: 'work' };
  const side: Category = { id: 'c-side', name: 'Side project', color: 'amber', icon: 'star', position: 1, legacy_key: null };
  const cats = [work, side];
  const catById = (id: string) => resolveCategory(cats, id);
  // A row cached before category_id existed carries a legacy id (see toWin()).
  const legacy: Win = { id: 'L', text: 'Old report', categoryId: legacyCategoryId('work'), ts: at(2026, 9, 1) };
  const current: Win = { id: 'C', text: 'New report', categoryId: 'c-work', ts: at(2026, 9, 2) };
  const other: Win = { id: 'S', text: 'Side report', categoryId: 'c-side', ts: at(2026, 9, 3) };
  const list = [legacy, current, other];

  it('matches a legacy-id win against its real category chip', () => {
    expect(ids(filterWins(list, { categoryIds: ['c-work'] }, catById))).toEqual(['L', 'C']);
    expect(ids(filterWins(list, { categoryIds: ['c-side'] }, catById))).toEqual(['S']);
  });

  it('searches the resolved category name of a legacy-id win', () => {
    expect(ids(filterWins(list, { query: 'work report' }, catById))).toEqual(['L', 'C']);
  });
});

describe('day keys', () => {
  it('shifts across month and year boundaries', () => {
    expect(shiftDayKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDayKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDayKey('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDayKey('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('steps one calendar day at a time over DST changes', () => {
    // Covers both EU and US switch dates; a no-op in zones without DST.
    for (const day of ['2026-03-08', '2026-03-29', '2026-10-25', '2026-11-01']) {
      expect(shiftDayKey(shiftDayKey(day, 1), -1)).toBe(day);
      expect(shiftDayKey(day, 1)).not.toBe(day);
    }
  });

  it('dayKeyTs is local midnight and round-trips with dayKey', () => {
    const ts = dayKeyTs('2026-09-27');
    expect(new Date(ts).getHours()).toBe(0);
    expect(dayKey(ts)).toBe('2026-09-27');
    expect(dayKey(at(2026, 9, 27, 23))).toBe('2026-09-27');
  });
});

describe('highlightParts', () => {
  it('returns the whole text when there are no terms', () => {
    expect(highlightParts('Hello', [])).toEqual([{ text: 'Hello', match: false }]);
  });

  it('marks every occurrence of every term, keeping the original text', () => {
    expect(highlightParts('Ran a run, RAN again', ['ran'])).toEqual([
      { text: 'Ran', match: true },
      { text: ' a run, ', match: false },
      { text: 'RAN', match: true },
      { text: ' again', match: false },
    ]);
  });

  it('maps accent-folded matches back onto the original characters', () => {
    expect(highlightParts('Chat at the Café today', searchTerms('cafe'))).toEqual([
      { text: 'Chat at the ', match: false },
      { text: 'Café', match: true },
      { text: ' today', match: false },
    ]);
  });

  it('merges overlapping terms into one part', () => {
    expect(highlightParts('searching', ['sear', 'arch'])).toEqual([
      { text: 'search', match: true },
      { text: 'ing', match: false },
    ]);
  });
});
