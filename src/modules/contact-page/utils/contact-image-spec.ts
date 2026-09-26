// src/modules/contact-page/utils/contact-image-spec.ts

import { ImageSpec } from '../../home-page/utils/image-spec';

/**
 * What each Contact page image slot has to be. Checked by the same
 * checkImageDimensions as the home hero, so the rules and the error wording are
 * identical - only the numbers differ.
 *
 * Both numbers below are the natural size of the crop the website currently
 * ships, because that file is exactly what an uploaded image replaces:
 *
 *   heroDesktop  public/images/contact_us_desktop.webp  - a wide composition
 *                with the agent and the message panel on the right and open
 *                space on the left for the copy.
 *   heroMobile   public/images/contact_us_mobile.webp   - a portrait crop,
 *                run as a banner above the copy below the `lg` breakpoint.
 *
 * The hero is the page's only authored image: the closing CTA is static
 * artwork in the website's own code and has no admin slot to check.
 *
 * The minimums are read from the files themselves, not from the `width` /
 * `height` attributes in the markup: contact_us_desktop.webp is 1672x940 while
 * the JSX rounds it to 941, and a spec of 941 would reject the site's own
 * artwork by one pixel.
 *
 * The 0.25 tolerance is the Insider page's, for the same reason: object-cover
 * crops rather than distorts, so the ratio check is there to catch a portrait
 * photo in a landscape slot, not a few percent of drift.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type ContactImageVariant = 'heroDesktop' | 'heroMobile';

export const CONTACT_IMAGE_SPECS: Readonly<Record<ContactImageVariant, ImageSpec>> = {
  heroDesktop: { label: 'Desktop image', width: 1672, height: 940, ratioTolerance: 0.25 },
  heroMobile: { label: 'Mobile image', width: 1055, height: 1491, ratioTolerance: 0.25 },
} as const;
