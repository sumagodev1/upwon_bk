// src/modules/home-page/utils/hero-image-spec.ts

import { ImageDimensions } from './image-dimensions';

/**
 * What a hero background has to be, per viewport.
 *
 * The desktop numbers are not invented: they are the dimensions of the site's
 * own static hero background (public/images/home_hero_bg.webp, 1600x566), which
 * is what an uploaded image replaces. The mobile numbers are a portrait crop of
 * the same band, sized so a 2x phone screen still gets a full-density image.
 *
 * Two rules, and they check different failures:
 *
 *   minimum size  - a smaller image gets upscaled by object-cover and looks
 *                   soft. This is the one that actually protects quality.
 *   aspect ratio  - object-cover crops rather than distorts, so a wrong ratio
 *                   is not broken, just badly cropped. The tolerance is wide
 *                   on purpose: it catches "a portrait photo in the desktop
 *                   slot", not "1600x570 instead of 1600x566".
 */

export type HeroImageVariant = 'desktop' | 'mobile';

/**
 * The shape rules for one image slot. Not hero-specific: any CMS section with
 * an uploaded image declares one of these and is checked by
 * checkImageDimensions below, so every slot reports failures the same way.
 */
export interface ImageSpec {
  /** Used in the error message, so it reads as the field the admin sees. */
  label: string;
  /** The recommended size, and also the minimum. */
  width: number;
  height: number;
  /** Fractional allowance on the aspect ratio, e.g. 0.2 = +/-20%. */
  ratioTolerance: number;
}

/** The hero's name for the same shape, kept so existing imports stay valid. */
export type HeroImageSpec = ImageSpec;

export const HERO_IMAGE_SPECS: Readonly<Record<HeroImageVariant, HeroImageSpec>> = {
  // Matches public/images/home_hero_bg.webp on the website.
  desktop: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  // Portrait, for the <picture> source that phones actually download.
  mobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
} as const;

export const describeImageSpec = (spec: ImageSpec): string =>
  `at least ${spec.width}x${spec.height}px`;

export const describeHeroImageSpec = (variant: HeroImageVariant): string =>
  describeImageSpec(HERO_IMAGE_SPECS[variant]);

/**
 * Checks dimensions against a spec.
 *
 * @returns null when acceptable, otherwise a message naming what is wrong.
 */
export function checkImageDimensions(
  spec: ImageSpec,
  dimensions: ImageDimensions,
): string | null {
  if (dimensions.width < spec.width || dimensions.height < spec.height) {
    return `${spec.label} must be at least ${spec.width}x${spec.height}px; this one is ${dimensions.width}x${dimensions.height}px`;
  }

  const targetRatio = spec.width / spec.height;
  const actualRatio = dimensions.width / dimensions.height;
  const drift = Math.abs(actualRatio - targetRatio) / targetRatio;

  if (drift > spec.ratioTolerance) {
    const shape = targetRatio >= 1 ? 'wide (landscape)' : 'tall (portrait)';
    return `${spec.label} should be roughly ${shape}, about ${spec.width}x${spec.height}px; this one is ${dimensions.width}x${dimensions.height}px and would be heavily cropped`;
  }

  return null;
}

/** Checks dimensions against a hero variant's spec. */
export function checkHeroImageDimensions(
  variant: HeroImageVariant,
  dimensions: ImageDimensions,
): string | null {
  return checkImageDimensions(HERO_IMAGE_SPECS[variant], dimensions);
}
