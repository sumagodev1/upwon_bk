// src/modules/about-page/validators/shared.ts

import { Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../../home-page/utils/heading-markup';
import { IMAGE_URL_MAX } from '../../home-page/utils/image-pair';

/**
 * The checks more than one About section needs, in one place so the wording an
 * admin sees is identical wherever the same mistake is made. The Contact page's
 * validators/shared.ts is the same file for the same reason.
 */

/**
 * Authoring limits shared by the sections that use them.
 *
 * These are the numbers the admin panel's counters and the website's own
 * client-side checks are written against, and the ones the migrations size
 * their columns to. Changing one means changing all three.
 */
export const EYEBROW_MAX = 120;
export const HEADING_MAX = 300;
export const SUBTEXT_MAX = 600;

/** The same check, and the same message, as the home hero heading. */
export function validateHeadingMarkup(v: Validator, field: string, value: string): void {
  v.custom(
    hasBalancedAccentMarkers(value),
    field,
    `${field} has an unclosed ** accent marker; wrap accented words as **like this**`,
    'UNBALANCED_ACCENT_MARKER',
  );
}

/*
 * One image slot's pair of sources, and the cap its URL half is checked against.
 *
 * Both live in home-page/utils/image-pair now, beside content-url and
 * image-asset, so this page's four slots and the Partner Program hero's
 * desktop/mobile pair are read by the SAME function rather than by copies of it -
 * a copy per module is how "a blank file id means no image" drifts. Re-exported
 * from here so every About validator keeps importing them from one place.
 */
export { IMAGE_URL_MAX };
export { readImagePair } from '../../home-page/utils/image-pair';
