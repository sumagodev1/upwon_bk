// src/modules/home-page/utils/image-spec.ts

import { ImageDimensions } from './image-dimensions';

/**
 * What an uploaded image has to be, per slot on the home page.
 *
 * None of these numbers are invented - each is taken from the asset the CMS
 * upload replaces:
 *
 *   hero backgrounds  public/images/home_hero_bg.webp is 1600x566, and the
 *                     mobile spec is a portrait crop of that same band.
 *   trust logos       the six brand logos in public/images/testimonial are all
 *                     500px wide with heights from 97 to 567.
 *
 * That last spread is why `ratioTolerance` is nullable. The hero is rendered
 * with object-cover, so a wrong ratio is silently cropped and worth rejecting.
 * Logos are object-contain, which preserves whatever shape they are - a 5:1
 * wordmark and a 1:1 roundel both render correctly, so enforcing a ratio there
 * would reject valid artwork for no benefit.
 */

export type ImageSlot = 'heroDesktop' | 'heroMobile' | 'trustLogo' | 'valuesCard';

export interface ImageSpec {
  /** Used in the error message, so it reads as the field the admin sees. */
  label: string;
  /** The minimum acceptable size, and the recommendation when a ratio applies. */
  width: number;
  height: number;
  /** Fractional allowance on the aspect ratio; null skips the check entirely. */
  ratioTolerance: number | null;
}

export const IMAGE_SPECS: Readonly<Record<ImageSlot, ImageSpec>> = {
  // Matches public/images/home_hero_bg.webp on the website.
  heroDesktop: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  // Portrait, for the <picture> source that phones actually download.
  heroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * Height floor is deliberately low: the shortest existing wordmark is 97px
   * tall, and the marquee renders every logo at a fixed height anyway. Width
   * is the rule that matters, since that is what determines sharpness.
   */
  trustLogo: { label: 'Logo', width: 300, height: 80, ratioTolerance: null },
  /*
   * Taken from the rendered shape rather than the current files.
   *
   * The card renders aspect-[4/3] with object-cover at roughly 400px wide, so
   * 800x600 is the 2x size and 4:3 is the ratio that is not cropped. The
   * placeholder photos in the component today are a mix of 1536x1024 and
   * 1600x566 - the second group is hero artwork reused, and is visibly sliced
   * on the live cards, which is exactly what the ratio rule exists to catch.
   */
  valuesCard: { label: 'Card image', width: 800, height: 600, ratioTolerance: 0.2 },
};

export const describeImageSpec = (slot: ImageSlot): string => {
  const spec = IMAGE_SPECS[slot];
  return spec.ratioTolerance === null
    ? `at least ${spec.width}x${spec.height}px, any shape`
    : `at least ${spec.width}x${spec.height}px`;
};

/**
 * Checks dimensions against a slot's spec.
 *
 * @returns null when acceptable, otherwise a message naming what is wrong.
 */
export function checkImageDimensions(
  slot: ImageSlot,
  dimensions: ImageDimensions,
): string | null {
  const spec = IMAGE_SPECS[slot];

  if (dimensions.width < spec.width || dimensions.height < spec.height) {
    return `${spec.label} must be at least ${spec.width}x${spec.height}px; this one is ${dimensions.width}x${dimensions.height}px`;
  }

  if (spec.ratioTolerance === null) return null;

  const targetRatio = spec.width / spec.height;
  const actualRatio = dimensions.width / dimensions.height;
  const drift = Math.abs(actualRatio - targetRatio) / targetRatio;

  if (drift > spec.ratioTolerance) {
    const shape = targetRatio >= 1 ? 'wide (landscape)' : 'tall (portrait)';
    return `${spec.label} should be roughly ${shape}, about ${spec.width}x${spec.height}px; this one is ${dimensions.width}x${dimensions.height}px and would be heavily cropped`;
  }

  return null;
}
