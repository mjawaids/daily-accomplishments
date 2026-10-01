/* Links from DailyWins to the Ibexoft website, tagged with UTM parameters so
   ibexoft.com analytics can tell which part of the app each visit came from.
   These links use rel="noopener" without "noreferrer": ibexoft.com is our own
   site, so the referrer is kept for attribution. */

/** Why the link exists: reaching support, or the "Powered by" credit. */
export type IbexoftCampaign = 'support' | 'credit';

/** Where in DailyWins the link sits; becomes utm_content. */
export type IbexoftPlacement =
  | 'auth-signin'
  | 'auth-signup'
  | 'profile'
  | 'timeline'
  | 'page-footer';

export const IBEXOFT_CONTACT_PATH = '/contact/';

export function ibexoftUrl(path: string, campaign: IbexoftCampaign, placement: IbexoftPlacement): string {
  const url = new URL(path, 'https://ibexoft.com');
  url.searchParams.set('utm_source', 'dailywins');
  // "referral" lands in GA4's Referral channel; a custom medium would show as Unassigned.
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', placement);
  return url.toString();
}
