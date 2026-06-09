/* DailyWins — category definitions + date/stat helpers.
   Ported from the Claude Design handoff (app/data.js) to TypeScript.
   Operates on a `Win` view-model derived from a Supabase Accomplishment. */

import type { Database } from './supabase';

export type Category = 'work' | 'personal' | 'learning' | 'health';
type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];

export interface Win {
  id: string;
  text: string;
  category: Category;
  /** epoch milliseconds, derived from created_at */
  ts: number;
}

export interface CatDef {
  id: Category;
  label: string;
  color: string;
}

export const CATS: Record<Category, CatDef> = {
  work: { id: 'work', label: 'Work', color: 'var(--cat-work)' },
  personal: { id: 'personal', label: 'Personal', color: 'var(--cat-personal)' },
  learning: { id: 'learning', label: 'Learning', color: 'var(--cat-learning)' },
  health: { id: 'health', label: 'Health', color: 'var(--cat-health)' },
};

export const CATEGORY_KEYS = Object.keys(CATS) as Category[];

export function toWin(a: Accomplishment): Win {
  return { id: a.id, text: a.text, category: a.category, ts: new Date(a.created_at).getTime() };
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
}

/** last-7-day counts for the bar chart */
export function weekBars(entries: Win[]): WeekBar[] {
  const out: WeekBar[] = [];
  const D = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = isoLocal(d);
    const count = entries.filter((e) => dayKey(e.ts) === k).length;
    out.push({ label: D[d.getDay()], count, isToday: i === 0 });
  }
  return out;
}

export interface CategoryMix {
  id: Category;
  label: string;
  count: number;
  pct: number;
}

export function categoryMix(entries: Win[]): CategoryMix[] {
  const total = entries.length || 1;
  return CATEGORY_KEYS.map((id) => {
    const c = entries.filter((e) => e.category === id).length;
    return { id, label: CATS[id].label, count: c, pct: Math.round((c / total) * 100) };
  }).sort((a, b) => b.count - a.count);
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
