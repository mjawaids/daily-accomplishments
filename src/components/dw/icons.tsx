/* DailyWins — icon set (inline SVG, currentColor) + brand Logo + CatGlyph.
   Ported from the Claude Design handoff (app/icons.jsx). */
import React from 'react';
import type { Category } from '../../lib/winsData';

export type IconName =
  | 'home' | 'insights' | 'user' | 'plus' | 'check' | 'search' | 'calendar' | 'star'
  | 'edit' | 'trash' | 'x' | 'chevL' | 'chevR' | 'chevD' | 'gear' | 'mail' | 'lock'
  | 'eye' | 'sun' | 'moon' | 'device' | 'bell' | 'flame' | 'spark' | 'more' | 'filter'
  | 'clock' | 'logout' | 'chevUp' | 'arrowUp' | 'target' | 'heartHand' | 'book'
  | 'activity' | 'briefcase' | 'chart' | 'sync' | 'download' | 'image' | 'flag';

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5',
  insights: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17 19 7',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  calendar: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  edit: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  x: 'M6 6l12 12M18 6 6 18',
  chevL: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  chevD: 'M6 9l6 6 6-6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  lock: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v9H5z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  device: 'M4 4h16v11H4zM2 20h20M9 15h6',
  bell: 'M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21a2 2 0 0 0 4 0',
  flame: 'M12 3c1 4-2 5-2 8a2 2 0 0 0 4 0c0-1 0-1 .5-2 1 1.5 2.5 2.6 2.5 5a5 5 0 0 1-10 0c0-4 4-6 5-11Z',
  spark: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  filter: 'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  logout: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 12h10M16 8l4 4-4 4',
  chevUp: 'M6 15l6-6 6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01',
  heartHand: 'M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM19 19H6a2 2 0 0 0-2 2',
  activity: 'M3 12h4l2 6 4-13 2 7h6',
  briefcase: 'M3 8h18v12H3zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3',
  chart: 'M5 21V8M12 21V3M19 21v-9',
  sync: 'M4 10a8 8 0 0 1 13-4l3 2M20 14a8 8 0 0 1-13 4l-3-2M17 4v4h-4M7 20v-4h4',
  download: 'M12 4v10M8 11l4 4 4-4M5 19h14',
  image: 'M4 4h16v16H4zM4 15l4-4 5 5M14 13l2-2 4 4',
  flag: 'M5 21V4M5 4c3-1.5 6 1.5 9 0v8c-3 1.5-6-1.5-9 0',
};

const GEAR_A = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z';
const GEAR_B =
  'M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H11a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V11a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z';

export interface IconProps {
  name: IconName | 'gear';
  size?: number;
  sw?: number;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 22, sw = 1.9, style }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
  if (name === 'gear') {
    return (
      <svg {...common}>
        <path d={GEAR_A} />
        <path d={GEAR_B} />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d={PATHS[name] || PATHS.check} />
    </svg>
  );
}

export interface LogoProps {
  size?: number;
  wordmark?: boolean;
  fontSize?: number;
  color?: string;
}

/** brand mark — rising sun + check, on warm gradient */
export function Logo({ size = 30, wordmark = true, fontSize = 21, color }: LogoProps) {
  const mark = (
    <div className="dw-mark" style={{ width: size, height: size }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 30 30" fill="none">
        <circle cx={15} cy={15} r={11} stroke="#fff" strokeWidth={2.4} strokeOpacity={0.55} />
        <path d="M9.3 15.4l3.8 3.7L21 11" stroke="#fff" strokeWidth={2.9} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
  if (!wordmark) return mark;
  return (
    <div className="dw-logo">
      {mark}
      <div className="word" style={{ fontSize, color }}>
        Daily<b>Wins</b>
      </div>
    </div>
  );
}

export const CAT_ICON: Record<Category, IconName> = {
  work: 'briefcase',
  personal: 'heartHand',
  learning: 'book',
  health: 'activity',
};

export interface CatGlyphProps {
  cat: Category;
  size?: number;
  iconSize?: number;
}

/** colored category chip glyph */
export function CatGlyph({ cat, size = 20, iconSize }: CatGlyphProps) {
  return (
    <span
      className="ic"
      style={{ width: size, height: size, background: `var(--cat-${cat})`, borderRadius: size * 0.32 }}
    >
      <Icon name={CAT_ICON[cat]} size={iconSize || size * 0.62} sw={2.1} />
    </span>
  );
}
