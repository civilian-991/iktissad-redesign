/**
 * Al Defaiya promo: the sister magazine's latest issue, shown in the homepage
 * magazine section and linked to defaiya.com. Editors update it monthly by
 * pasting the new issue's link in Admin → Magazines; the cover image follows
 * from the issue code in that link.
 *
 * Stored in site_settings under DEFAIYA_SETTING_KEY as { url, enabled }.
 */

export const DEFAIYA_SETTING_KEY = 'defaiya_promo';

export interface DefaiyaPromoSetting {
  url: string;
  enabled: boolean;
}

export interface DefaiyaPromo {
  url: string;
  cover: string;
  issueCode: string;
}

// e.g. https://www.defaiya.com/issues/defaiya/DR0161/browse
const ISSUE_LINK = /^https?:\/\/(www\.)?defaiya\.com\/issues\/defaiya\/(D[RS]\d+)(\/|$)/i;

/** Builds the promo from an issue link, or null when the link isn't a Defaiya issue. */
export function parseDefaiyaLink(url: string): DefaiyaPromo | null {
  const match = url.trim().match(ISSUE_LINK);
  if (!match) return null;
  const issueCode = match[2].toUpperCase();
  const kind = issueCode.startsWith('DS') ? 'special' : 'regular';
  return {
    url: url.trim(),
    issueCode,
    cover: `https://www.defaiya.com/sites/default/files/magazines/defaiya/${kind}/${issueCode}/cover.jpg`,
  };
}
