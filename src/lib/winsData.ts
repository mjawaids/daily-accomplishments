/* DailyWins — win view-model + date/stat helpers (categories: ./categories.ts).
   Ported from the Claude Design handoff (app/data.js) to TypeScript.
   Operates on a `Win` view-model derived from a Supabase Accomplishment. */

import type { Database } from './supabase';
import { legacyCategoryId, resolveCategory } from './categories';
import type { Category } from './categories';

type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];

export interface Win {
  id: string;
  text: string;
  /** A categories.id, or `legacy:<key>` for a row cached before category_id
      existed (see resolveCategory()). */
  categoryId: string;
  /** epoch milliseconds, derived from created_at */
  ts: number;
}

export function toWin(a: Accomplishment): Win {
  return {
    id: a.id,
    text: a.text,
    categoryId: a.category_id || legacyCategoryId(a.category || 'work'),
    ts: new Date(a.created_at).getTime(),
  };
}

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function isoLocal(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayKey(ts: number): string {
  return isoLocal(new Date(ts));
}

/** Local midnight of a `YYYY-MM-DD` day key (the inverse of dayKey()). */
export function dayKeyTs(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** The day key `delta` calendar days after `day` (negative = before). */
export function shiftDayKey(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return isoLocal(new Date(y, m - 1, d + delta));
}

export function relativeDay(ts: number): string | null {
  const today = startOfDay(Date.now());
  const that = startOfDay(ts);
  const diff = Math.round((today - that) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return DAYNAMES[new Date(ts).getDay()];
  if (diff < 14) return 'Last week';
  return null;
}

export function dayLabel(ts: number): string {
  const d = new Date(ts);
  return DAYNAMES[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
}

export function shortDay(ts: number): string {
  const d = new Date(ts);
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
}

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + pad(m) + ' ' + ap;
}

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

export function monthLabel(ts: number): string {
  const d = new Date(ts);
  return MONTHS[d.getMonth()] + ' ' + ("'" + String(d.getFullYear()).slice(2));
}

/** Lower-cased, accent-stripped form used for matching ("Café" → "cafe"). */
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

/** Search terms from a query box: folded, split on whitespace, empties dropped. */
export function searchTerms(query: string): string[] {
  return foldText(query).split(/\s+/).filter(Boolean);
}

export interface WinFilter {
  query?: string;
  /** A local-date `YYYY-MM-DD` key (see dayKey()) to restrict to one day. */
  day?: string | null;
  /** Keep only wins in any of these categories. Empty or absent = all. */
  categoryIds?: string[];
}

/** Wins matching every search term (in the text or the category name), in
    one of `categoryIds` if any are given, and falling on `day` if given. An
    empty filter keeps everything. `categoryOf` resolves a win's categoryId
    (which may be a `legacy:` id) to its category, as catById does. */
export function filterWins(
  entries: Win[],
  filter: WinFilter,
  categoryOf: (categoryId: string) => { id: string; name: string }
): Win[] {
  const terms = searchTerms(filter.query || '');
  const day = filter.day || null;
  const cats = filter.categoryIds && filter.categoryIds.length ? new Set(filter.categoryIds) : null;
  if (!terms.length && !day && !cats) return entries;
  return entries.filter((e) => {
    if (day && dayKey(e.ts) !== day) return false;
    const cat = categoryOf(e.categoryId);
    if (cats && !cats.has(cat.id)) return false;
    if (!terms.length) return true;
    const hay = foldText(e.text) + '\n' + foldText(cat.name);
    return terms.every((t) => hay.includes(t));
  });
}

/** Splits `text` into plain and matched parts for highlighting search terms.
    Matching is accent- and case-insensitive (like filterWins()), but the parts
    carry the original text. */
export function highlightParts(text: string, terms: string[]): Array<{ text: string; match: boolean }> {
  if (!terms.length) return [{ text, match: false }];
  // Fold character by character, remembering where each folded character came
  // from, so a match in the folded string maps back onto the original.
  const chars = Array.from(text);
  let folded = '';
  const origin: number[] = [];
  chars.forEach((ch, i) => {
    const f = foldText(ch);
    folded += f;
    for (let k = 0; k < f.length; k++) origin.push(i);
  });
  const hit = new Array<boolean>(chars.length).fill(false);
  for (const t of terms) {
    for (let at = folded.indexOf(t); at !== -1; at = folded.indexOf(t, at + t.length)) {
      for (let k = at; k < at + t.length; k++) hit[origin[k]] = true;
    }
  }
  const parts: Array<{ text: string; match: boolean }> = [];
  chars.forEach((ch, i) => {
    const last = parts[parts.length - 1];
    if (last && last.match === hit[i]) last.text += ch;
    else parts.push({ text: ch, match: hit[i] });
  });
  return parts;
}

export interface DayGroup {
  key: string;
  ts: number;
  entries: Win[];
}

/** group wins by day → most recent first */
export function groupByDay(entries: Win[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of entries) {
    const k = dayKey(e.ts);
    if (!map.has(k)) map.set(k, { key: k, ts: startOfDay(e.ts), entries: [] });
    map.get(k)!.entries.push(e);
  }
  const groups = [...map.values()].sort((a, b) => b.ts - a.ts);
  groups.forEach((g) => g.entries.sort((a, b) => b.ts - a.ts));
  return groups;
}

/** consecutive days (incl today or yesterday) with >= 1 entry */
export function computeStreak(entries: Win[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => dayKey(e.ts)));
  let streak = 0;
  let cur = startOfDay(Date.now());
  if (!days.has(isoLocal(new Date(cur)))) {
    cur -= 86400000;
    if (!days.has(isoLocal(new Date(cur)))) return 0;
  }
  while (days.has(isoLocal(new Date(cur)))) {
    streak++;
    cur -= 86400000;
  }
  return streak;
}

export function entriesThisWeek(entries: Win[]): number {
  const now = new Date();
  const day = now.getDay();
  const monday = startOfDay(Date.now()) - ((day + 6) % 7) * 86400000;
  return entries.filter((e) => e.ts >= monday).length;
}

export interface WeekBar {
  label: string;
  count: number;
  isToday: boolean;
  /** Full weekday name ("Tuesday"), for screen readers and the best-day label. */
  fullLabel: string;
}

/** last-7-day counts for the bar chart */
export function weekBars(entries: Win[]): WeekBar[] {
  const out: WeekBar[] = [];
  const D = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = isoLocal(d);
    const count = entries.filter((e) => dayKey(e.ts) === k).length;
    out.push({ label: D[d.getDay()], fullLabel: FULL[d.getDay()], count, isToday: i === 0 });
  }
  return out;
}

export interface CategoryMix {
  category: Category;
  count: number;
  pct: number;
}

/** Wins per category, most-used first. Only categories with wins are listed
    (a user can have up to 20), except that with no wins at all every category
    is shown at 0%. Wins whose category cannot be resolved get their own
    "Uncategorized" row so the percentages still add up. */
export function categoryMix(entries: Win[], categories: Category[]): CategoryMix[] {
  if (!entries.length) return categories.map((category) => ({ category, count: 0, pct: 0 }));
  const buckets = new Map<string, { category: Category; count: number }>();
  for (const e of entries) {
    const category = resolveCategory(categories, e.categoryId);
    const bucket = buckets.get(category.id) || { category, count: 0 };
    bucket.count += 1;
    buckets.set(category.id, bucket);
  }
  return [...buckets.values()]
    .map(({ category, count }) => ({ category, count, pct: Math.round((count / entries.length) * 100) }))
    .sort((a, b) => b.count - a.count || a.category.position - b.category.position);
}

export interface HeatCell {
  k: string;
  c: number;
}

/** 12-week heatmap data (newest last) */
export function heatCells(entries: Win[]): HeatCell[] {
  const cells: HeatCell[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = isoLocal(d);
    const c = entries.filter((e) => dayKey(e.ts) === k).length;
    cells.push({ k, c });
  }
  return cells;
}
