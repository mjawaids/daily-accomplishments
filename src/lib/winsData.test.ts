import { describe, expect, it, vi } from 'vitest';

// winsData.ts imports categories.ts, which imports the Supabase client.
vi.mock('./supabase', () => ({ supabase: {} }));

import { dayKey, filterWins, highlightParts, searchTerms } from './winsData';
import type { Win } from './winsData';

const names: Record<string, string> = { w: 'Work', h: 'Health' };
const catName = (id: string) => names[id] || 'Uncategorized';

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
