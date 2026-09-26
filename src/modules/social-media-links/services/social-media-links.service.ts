// src/modules/social-media-links/services/social-media-links.service.ts

import * as linesRepository from '../repositories/contact-lines.repository';
import * as linksRepository from '../repositories/social-links.repository';
import { PublicSocialMediaLinks } from '../types/social-media-links.types';
import { toPublicContactLine } from './contact-lines.service';
import { toPublicSocialLink } from './social-links.service';

/**
 * The website-facing read: both of the footer's lists, ACTIVE rows only, in
 * display order, in one response.
 *
 * One read for both halves, unlike the admin side, where each list is its own
 * resource. The footer renders them as one block on every page, and a second
 * request for the icon row would only double what every page view costs - and
 * add a way for the two halves to disagree.
 *
 * Never a 404. There is no section copy here that could be "never authored",
 * so "nothing yet" is answered per list by the two flags instead: each counts
 * its rows REGARDLESS of status, so the site can tell "every line is INACTIVE"
 * (contactLines: [], hasContactLines: true - render none) from "there is no
 * line here at all" (contactLines: [], hasContactLines: false - nothing is
 * authored, keep the built-in four). Nothing in the panel or the API forbids
 * emptying either list, so the read has to say which of the two it is rather
 * than leave the site guessing: see the note on PublicSocialMediaLinks.
 */
export const getPublished = async (): Promise<PublicSocialMediaLinks> => {
  const [contactLines, contactLineTotal, socialLinks, socialLinkTotal] = await Promise.all([
    linesRepository.findPublished(),
    linesRepository.count(),
    linksRepository.findPublished(),
    linksRepository.count(),
  ]);

  return {
    contactLines: contactLines.map(toPublicContactLine),
    hasContactLines: contactLineTotal > 0,
    socialLinks: socialLinks.map(toPublicSocialLink),
    hasSocialLinks: socialLinkTotal > 0,
  };
};
