import { describe, expect, it } from 'vitest';
import { isFreshSignup, stripTourParam, wantsTour } from './onboarding';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('isFreshSignup', () => {
  it('is true for the first sign-in of a just-created account', () => {
    expect(isFreshSignup({ created_at: iso(5000), last_sign_in_at: iso(4000) }, NOW)).toBe(true);
  });

  it('is false for a returning user', () => {
    expect(isFreshSignup({ created_at: iso(10 * 86400000), last_sign_in_at: iso(1000) }, NOW)).toBe(false);
  });

  it('is false for a second sign-in shortly after creating the account', () => {
    expect(isFreshSignup({ created_at: iso(10 * 60000), last_sign_in_at: iso(1000) }, NOW)).toBe(false);
  });

  it('is false once the account is older than the fresh window', () => {
    expect(isFreshSignup({ created_at: iso(60 * 60000), last_sign_in_at: iso(60 * 60000 - 1000) }, NOW)).toBe(false);
  });

  it('is false when timestamps are missing or invalid', () => {
    expect(isFreshSignup(null, NOW)).toBe(false);
    expect(isFreshSignup({ created_at: iso(1000) }, NOW)).toBe(false);
    expect(isFreshSignup({ created_at: 'nope', last_sign_in_at: iso(1000) }, NOW)).toBe(false);
  });
});

describe('tour param', () => {
  it('detects ?tour=1 only', () => {
    expect(wantsTour('?tour=1')).toBe(true);
    expect(wantsTour('?auth=signin&tour=1')).toBe(true);
    expect(wantsTour('?tour=0')).toBe(false);
    expect(wantsTour('')).toBe(false);
  });

  it('strips tour and keeps other params', () => {
    expect(stripTourParam('?tour=1')).toBe('');
    expect(stripTourParam('?checkout=pro&tour=1')).toBe('?checkout=pro');
    expect(stripTourParam('')).toBe('');
  });
});
