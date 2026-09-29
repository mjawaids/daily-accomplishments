/* DailyWins — keyboard helpers shared by the shortcut handlers and their hints. */

/** True on Apple platforms, where the command key is ⌘ rather than Ctrl. */
export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** True when a key event comes from somewhere the user is typing, so
    single-key shortcuts like "/" must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}
