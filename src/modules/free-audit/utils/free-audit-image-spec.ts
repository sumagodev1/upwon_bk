// src/modules/free-audit/utils/free-audit-image-spec.ts

import { ImageSpec } from '../../home-page/utils/image-spec';
import { BLOG_IMAGE_SPECS } from '../../blog/utils/blog-image-spec';

/**
 * What each Free Operational Audit image slot has to be. Checked by the same
 * checkImageDimensions as every other CMS image slot, so the rules and the
 * error wording are identical.
 *
 *   heroDesktop / heroMobile  The hero slides render in the same HeroSlider as
 *         the Blog and Insider heroes, into the same boxes, so they take the
 *         Blog hero's two specs unchanged (blog-image-spec.ts, which in turn
 *         takes the Insider hero's). The seeded slide's backdrop is the site's
 *         shared hero artwork (the legacy, seed-only image_url), which is never
 *         checked.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type FreeAuditImageVariant = 'heroDesktop' | 'heroMobile';

export const FREE_AUDIT_IMAGE_SPECS: Readonly<Record<FreeAuditImageVariant, ImageSpec>> = {
  heroDesktop: BLOG_IMAGE_SPECS.heroDesktop,
  heroMobile: BLOG_IMAGE_SPECS.heroMobile,
} as const;
