// src/modules/knowledgebase/utils/kb-image-spec.ts

import { ImageSpec } from '../../home-page/utils/image-spec';
import { BLOG_IMAGE_SPECS } from '../../blog/utils/blog-image-spec';

/**
 * What each Knowledgebase image slot has to be. Checked by the same
 * checkImageDimensions as every other CMS image slot, so the rules and the
 * error wording are identical.
 *
 *   heroDesktop / heroMobile  The hero slides render in the same HeroSlider as
 *         the Blog and Insider heroes, into the same boxes, so they take the
 *         Blog hero's two specs unchanged (blog-image-spec.ts, which in turn
 *         takes the Insider hero's). The seeded slide's backdrop is the
 *         Unsplash photograph the page has always used (the legacy, seed-only
 *         image_url), which is never checked.
 *
 * The hero is the only picture in this module: categories draw an icon, and
 * an article has no image at all.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type KbImageVariant = 'heroDesktop' | 'heroMobile';

export const KB_IMAGE_SPECS: Readonly<Record<KbImageVariant, ImageSpec>> = {
  heroDesktop: BLOG_IMAGE_SPECS.heroDesktop,
  heroMobile: BLOG_IMAGE_SPECS.heroMobile,
} as const;
