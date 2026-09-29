/* DailyWins — user-managed categories, stored server-side in `categories`.

   Every user starts with the four defaults (Work, Personal, Learning, Health),
   seeded lazily on first load like user_settings (see ensureCategories()).
   The defaults carry a legacy_key that maps the old hardcoded text values
   (accomplishments.category) onto them.

   The color and icon lists below must match the CHECK constraints in
   supabase/migrations/20260929120000_user_categories.sql. */

import { supabase } from './supabase';
import type { CSSProperties } from 'react';
import type { IconName } from '../components/dw/icons';

export const CATEGORY_COLORS = ['blue', 'rose', 'violet', 'green', 'amber', 'teal', 'orange', 'slate'] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_ICONS = [
  'briefcase',
  'heartHand',
  'book',
  'activity',
  'star',
  'target',
  'flame',
  'spark',
  'flag',
  'home',
  'user',
  'calendar',
  'chart',
  'clock',
  'mail',
  'image',
] as const satisfies readonly IconName[];
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const LEGACY_KEYS = ['work', 'personal', 'learning', 'health'] as const;
export type LegacyKey = (typeof LEGACY_KEYS)[number];

export const MAX_CATEGORIES = 20;
export const MAX_NAME_LENGTH = 24;

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
  icon: CategoryIcon;
  position: number;
  legacy_key: LegacyKey | null;
}

/* Ids of the form `legacy:<key>` stand in for a default category whose real row
   is not known here: the marketing screens before sign-in, a win cached before
   category_id existed, or a first run with no connection. resolveCategory()
   maps them onto the user's real row, and writes send them as the old text
   column, which the database resolves (see categoryWriteFields()). */
const LEGACY_PREFIX = 'legacy:';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: LEGACY_PREFIX + 'work', name: 'Work', color: 'blue', icon: 'briefcase', position: 0, legacy_key: 'work' },
  { id: LEGACY_PREFIX + 'personal', name: 'Personal', color: 'rose', icon: 'heartHand', position: 1, legacy_key: 'personal' },
  { id: LEGACY_PREFIX + 'learning', name: 'Learning', color: 'violet', icon: 'book', position: 2, legacy_key: 'learning' },
  { id: LEGACY_PREFIX + 'health', name: 'Health', color: 'green', icon: 'activity', position: 3, legacy_key: 'health' },
];

const UNKNOWN_CATEGORY: Category = {
  id: '',
  name: 'Uncategorized',
  color: 'slate',
  icon: 'flag',
  position: Number.MAX_SAFE_INTEGER,
  legacy_key: null,
};

export function legacyCategoryId(key: string): string {
  return LEGACY_PREFIX + key;
}

export function categoryColor(cat: Pick<Category, 'color'>): string {
  return `var(--cat-${cat.color})`;
}

/** Inline style that feeds a category's color to `.dw-chip.active` and
    `.dw-node` via the --cat-color custom property. */
export function catColorVar(cat: Pick<Category, 'color'>): CSSProperties {
  return { '--cat-color': categoryColor(cat) } as CSSProperties;
}

/** Finds a win's category, mapping `legacy:<key>` ids onto the user's row. */
export function resolveCategory(categories: Category[], id: string): Category {
  const hit = categories.find((c) => c.id === id);
  if (hit) return hit;
  if (id.startsWith(LEGACY_PREFIX)) {
    const key = id.slice(LEGACY_PREFIX.length);
    return (
      categories.find((c) => c.legacy_key === key) ||
      DEFAULT_CATEGORIES.find((c) => c.legacy_key === key) ||
      UNKNOWN_CATEGORY
    );
  }
  return UNKNOWN_CATEGORY;
}

/** The columns to write for a win's category. */
export function categoryWriteFields(id: string): { category_id: string } | { category: LegacyKey } {
  if (id.startsWith(LEGACY_PREFIX)) {
    const key = id.slice(LEGACY_PREFIX.length) as LegacyKey;
    return { category: LEGACY_KEYS.includes(key) ? key : 'work' };
  }
  return { category_id: id };
}

/** Analytics label: never the user-typed name. */
export function analyticsLabel(cat: Category): string {
  return cat.legacy_key ?? 'custom';
}

/** Returns an error message, or null when the name is valid. */
export function validateCategoryName(name: string, categories: Category[], editingId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the category a name';
  if (trimmed.length > MAX_NAME_LENGTH) return `Keep it to ${MAX_NAME_LENGTH} characters`;
  const clash = categories.some((c) => c.id !== editingId && c.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (clash) return 'You already have a category with that name';
  return null;
}

// ---- persistence ----------------------------------------------------------

const COLUMNS = 'id, name, color, icon, position, legacy_key';
const cacheKey = (userId: string) => 'dw_categories_' + userId;

export function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => a.position - b.position);
}

export function readCachedCategories(userId: string): Category[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Category[];
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedCategories(userId: string, list: Category[]): void {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

async function selectCategories(userId: string): Promise<Category[] | null> {
  const { data, error } = await supabase
    .from('categories')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error loading categories:', error);
    return null;
  }
  return data as unknown as Category[];
}

/** Reads the user's categories, seeding the defaults on first run. Returns null
    when they could not be read (offline, or the request failed). */
export async function ensureCategories(userId: string): Promise<Category[] | null> {
  const existing = await selectCategories(userId);
  if (!existing) return null;
  if (existing.length) return existing;

  // Another tab or device may seed at the same time; the unique
  // (user_id, legacy_key) index turns the loser's insert into a no-op.
  const { error } = await supabase.from('categories').upsert(
    DEFAULT_CATEGORIES.map((c) => ({
      user_id: userId,
      name: c.name,
      color: c.color,
      icon: c.icon,
      position: c.position,
      legacy_key: c.legacy_key,
    })),
    { onConflict: 'user_id,legacy_key', ignoreDuplicates: true }
  );
  if (error) {
    console.error('Error seeding categories:', error);
    return null;
  }
  return selectCategories(userId);
}

export interface CategoryInput {
  name: string;
  color: CategoryColor;
  icon: CategoryIcon;
}

export async function createCategory(userId: string, input: CategoryInput, position: number): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: input.name.trim(), color: input.color, icon: input.icon, position })
    .select(COLUMNS)
    .single();
  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  return data as unknown as Category;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: input.name.trim(), color: input.color, icon: input.icon })
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) {
    console.error('Error updating category:', error);
    return null;
  }
  return data as unknown as Category;
}

/** Moves the category's wins into `moveTo`, then deletes it (atomically). */
export async function deleteCategory(id: string, moveTo: string): Promise<boolean> {
  const { error } = await supabase.rpc('delete_category', { p_id: id, p_move_to: moveTo });
  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }
  return true;
}
