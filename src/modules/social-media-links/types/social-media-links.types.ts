// src/modules/social-media-links/types/social-media-links.types.ts

import { PublicSocialContactLine } from './contact-lines.types';
import { PublicSocialLink } from './social-links.types';

/**
 * Both of the footer's lists, ACTIVE rows only, in one response - the footer
 * renders them as one block, on every page, and a second request for the icon
 * row would only double the calls every page view makes.
 *
 * Either array can legitimately be empty, and the matching `has*` flag is what
 * tells the site WHY. Without it an empty array has two meanings the site
 * cannot separate:
 *
 *   the list holds no row at all      -> the CMS has nothing authored here, so
 *   (none added, or all deleted)         the site keeps its built-in lines (or
 *                                        its built-in LinkedIn and Twitter
 *                                        icons). The panel says so while its
 *                                        table is empty, so nobody is surprised
 *                                        by it;
 *   every row is INACTIVE             -> render none. That IS somebody's choice,
 *                                        and putting the built-in list back
 *                                        would republish exactly what they just
 *                                        took down.
 *
 * So each flag counts its list's rows REGARDLESS of status - the same contract
 * as PublicAboutTeamSection.hasMembers.
 *
 * Always a 200, unlike a section read: there is no singleton here that could
 * be "never authored", so "nothing yet" is answered by the two flags rather
 * than by a 404.
 */
export interface PublicSocialMediaLinks {
  contactLines: PublicSocialContactLine[];
  /** Whether any contact line row exists at all - ACTIVE or INACTIVE. See above. */
  hasContactLines: boolean;
  socialLinks: PublicSocialLink[];
  /** Whether any social link row exists at all - ACTIVE or INACTIVE. See above. */
  hasSocialLinks: boolean;
}
