import { describe, expect, it } from 'vitest';
import { isTypingTarget } from './keys';

// vitest runs in node (no DOM), so plain objects stand in for elements.
const el = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable }) as unknown as EventTarget;

describe('isTypingTarget', () => {
  it('is true where the user types', () => {
    expect(isTypingTarget(el('INPUT'))).toBe(true);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('SELECT'))).toBe(true);
    expect(isTypingTarget(el('DIV', true))).toBe(true);
  });

  it('is false elsewhere', () => {
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(el('BODY'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    // window has no tagName
    expect(isTypingTarget({} as EventTarget)).toBe(false);
  });
});
