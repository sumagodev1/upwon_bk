// src/database/seeds/social-media-links.data.ts

import { SocialContactLineKind } from '../../config/constants';

/**
 * The footer's contact lines as the website renders them today, so the first
 * migrate publishes the footer's own lines rather than an empty list. Sources,
 * on the website:
 *
 *   src/data/company.js                            - COMPANY.contact
 *   src/components/shared/Footer/Footer.jsx        - which of those it prints,
 *                                                    in what order, with which
 *                                                    icon
 *
 * Every string below is verbatim: a seed that "tidied" the phone number's
 * spacing would show up as a diff in the footer of every page the first time
 * it is run. The one change is that the site now derives a link for every kind
 * but ADDRESS, so the website line - plain text today - becomes a link to
 * https://www.upwon.in once published.
 *
 * The social icons are seeded too - the LinkedIn and Twitter buttons the
 * footer has always drawn - so they show up in the admin panel as rows an
 * administrator can edit, rather than as built-in fallbacks the panel cannot
 * see. The site linked both to '#', which the column's CHECK refuses, so each
 * gets a profile address to be CONFIRMED in the panel: Twitter's is built from
 * the site's own TWITTER_HANDLE ('@upwon' in src/seo/siteConfig.js, itself
 * marked "update when the handle is live"), and LinkedIn's is the conventional
 * company-page address for the same name.
 */

export interface SeedSocialContactLine {
  /** Decides how the site links the line - see SOCIAL_CONTACT_LINE_KINDS. */
  kind: SocialContactLineKind;
  /** A name from SOCIAL_MEDIA_ICON_NAMES - the lucide icon Footer.jsx draws. */
  icon: string;
  value: string;
}

/** The four lines Footer.jsx renders, in its order. All seeded ACTIVE. */
export const SOCIAL_CONTACT_LINES: SeedSocialContactLine[] = [
  { kind: 'ADDRESS', icon: 'MapPin', value: 'Nashik, Maharashtra, India' },
  { kind: 'EMAIL', icon: 'Mail', value: 'hello@upwon.in' },
  { kind: 'PHONE', icon: 'Phone', value: '+91 93568 98277' },
  { kind: 'WEBSITE', icon: 'Globe', value: 'www.upwon.in' },
];

/**
 * No label: like the admin API, the seed writes the platform name for the
 * icon (SOCIAL_LINK_LABELS) - 'LinkedIn' and 'Twitter' here.
 */
export interface SeedSocialLink {
  /** A name from SOCIAL_MEDIA_ICON_NAMES. */
  icon: string;
  /** Absolute http(s) - see the note above: confirm both in the panel. */
  url: string;
}

/** The two buttons Footer.jsx draws, in its order. Both seeded ACTIVE. */
export const SOCIAL_LINKS: SeedSocialLink[] = [
  { icon: 'Linkedin', url: 'https://www.linkedin.com/company/upwon' },
  { icon: 'Twitter', url: 'https://twitter.com/upwon' },
];
