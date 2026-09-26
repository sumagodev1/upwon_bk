// src/modules/blog/utils/blog-image-spec.ts

import { ImageSpec } from '../../home-page/utils/image-spec';
import { INSIDER_IMAGE_SPECS } from '../../insider-page/utils/insider-image-spec';

/**
 * What each Blog image slot has to be. Checked by the same checkImageDimensions
 * as every other CMS image slot, so the rules and the error wording are
 * identical - only the numbers differ, and they are derived from the boxes each
 * image is rendered into:
 *
 *   heroDesktop / heroMobile  The hero slides render in the same HeroSlider as
 *         the Insider hero, into the same boxes, so they take its two specs
 *         unchanged (insider-image-spec.ts). The seeded slide's backdrop is the
 *         site's shared hero artwork (the legacy, seed-only image_url), which
 *         is never checked.
 *
 *   post  The same picture is the grid card (aspect-[16/9], a third of a
 *         1200px grid), the featured "Latest" card (aspect-[16/10] on narrow
 *         screens, half the container from lg up) and the article page's
 *         full-bleed header behind the title. The header is the demanding
 *         one, so the floor is sized for it: 1200px wide keeps it acceptable
 *         on a laptop, and 16:9 is the card's own shape, which the header and
 *         the featured card crop with object-cover. The tolerance matches the
 *         Insider hero's, because three different crops of one picture are
 *         never going to agree on a single exact ratio.
 *
 *   postMobile  The optional phone crop, served in place of `post` by the same
 *         boxes' <picture> source at (max-width: 767px). There the article
 *         header is a PORTRAIT band - min-h-[68vh], so at least 552px tall on a
 *         375x812 phone, about 0.68:1 or narrower - where the 16:9 desktop crop
 *         would keep only a thin vertical sliver of its middle. 900x1200 is the
 *         Partner hero's phone crop (partner-image-spec.ts): 900 covers a 450px
 *         phone at 2x, and 3:4 with the same 0.25 tolerance takes everything
 *         from 9:16 (a phone camera held upright) to 15:16 and refuses a
 *         landscape photograph. The phone's cards stay 16:9 / 16:10 boxes and
 *         cover-crop the middle band of this crop, so its subject belongs in
 *         the centre.
 *
 * A post's picture is always an upload, and every upload is held to this. The
 * nine seeded posts are the one exception: their pictures are the 1600px-wide
 * Unsplash photographs data/blog.js has always linked (the legacy, seed-only
 * image_url column), which clear it comfortably but are never checked. None of
 * them has a phone crop.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type BlogImageVariant = 'heroDesktop' | 'heroMobile' | 'post' | 'postMobile';

export const BLOG_IMAGE_SPECS: Readonly<Record<BlogImageVariant, ImageSpec>> = {
  heroDesktop: INSIDER_IMAGE_SPECS.heroDesktop,
  heroMobile: INSIDER_IMAGE_SPECS.heroMobile,
  post: { label: 'Post image', width: 1200, height: 675, ratioTolerance: 0.25 },
  postMobile: { label: 'Mobile image', width: 900, height: 1200, ratioTolerance: 0.25 },
} as const;
