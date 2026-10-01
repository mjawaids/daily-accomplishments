import { describe, expect, it } from 'vitest';
import { IBEXOFT_CONTACT_PATH, ibexoftUrl, jawaidUrl } from './links';

describe('ibexoftUrl', () => {
  it('tags the contact page with UTM parameters', () => {
    expect(ibexoftUrl(IBEXOFT_CONTACT_PATH, 'support', 'auth-signin')).toBe(
      'https://ibexoft.com/contact/?utm_source=dailywins&utm_medium=referral&utm_campaign=support&utm_content=auth-signin',
    );
  });

  it('tags the home page for credit links', () => {
    expect(ibexoftUrl('/', 'credit', 'profile')).toBe(
      'https://ibexoft.com/?utm_source=dailywins&utm_medium=referral&utm_campaign=credit&utm_content=profile',
    );
  });
});

describe('jawaidUrl', () => {
  it('tags the credit link with its placement', () => {
    expect(jawaidUrl('timeline')).toBe(
      'https://jawaid.dev/?utm_source=dailywins&utm_medium=referral&utm_campaign=credit&utm_content=timeline',
    );
  });
});
