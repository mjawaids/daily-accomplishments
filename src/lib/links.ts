/* Links from DailyWins to our own websites (ibexoft.com and jawaid.dev),
   tagged with UTM parameters so their analytics can tell which part of the app
   each visit came from. These links use rel="noopener" without "noreferrer":
   the sites are ours, so the referrer is kept for attribution. */

/** Why the link exists: reaching support, or the "Developed by" / "Powered by" credit. */
export type LinkCampaign = 'support' | 'credit';

/** Where in DailyWins the link sits; becomes utm_content. */
export type LinkPlacement =
  | 'auth-signin'
  | 'auth-signup'
  | 'profile'
  | 'timeline'
  | 'page-footer';

export const IBEXOFT_CONTACT_PATH = '/contact/';

function taggedUrl(origin: string, path: string, campaign: LinkCampaign, placement: LinkPlacement): string {
  const url = new URL(path, origin);
  url.searchParams.set('utm_source', 'dailywins');
  // "referral" lands in GA4's Referral channel; a custom medium would show as Unassigned.
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', placement);
  return url.toString();
}

export function ibexoftUrl(path: string, campaign: LinkCampaign, placement: LinkPlacement): string {
  return taggedUrl('https://ibexoft.com', path, campaign, placement);
}

export function jawaidUrl(placement: LinkPlacement): string {
  return taggedUrl('https://jawaid.dev', '/', 'credit', placement);
}
