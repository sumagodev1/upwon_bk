// src/modules/insider-page/utils/insider-image-spec.ts

import { HERO_IMAGE_SPECS, ImageSpec } from '../../home-page/utils/image-spec';

/**
 * What each Insider page image slot has to be. Checked by the same
 * checkImageDimensions as the home hero, so the rules and the error wording
 * are identical - only the numbers differ, and each is derived from the box
 * the image is rendered into:
 *
 *   heroDesktop  HeroSlider stacks its top padding (pt-40), a min-h-[620px]
 *                content box, and pb-12, so on desktop the section is at least
 *                ~830px tall across the full viewport width: about 1.5:1 at
 *                1280px, 1.75:1 at 1440px, 2.3:1 at 1920px. The home hero's
 *                1600x566 (2.83:1) would lose over a third of its width to
 *                object-cover on a laptop, so this slot targets 16:9 - the
 *                middle of that range - with a wider tolerance to cover it.
 *   heroMobile   Phones see the same portrait band the home hero does, so the
 *                home mobile spec is reused unchanged.
 *   story        The card image box is aspect-[16/9]; 800px wide covers the
 *                widest card (a third of a 1200px grid) at 2x.
 *   feature      The feature image is aspect-[4/3] at roughly half the page
 *                width.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type InsiderImageVariant = 'heroDesktop' | 'heroMobile' | 'story' | 'feature';

export const INSIDER_IMAGE_SPECS: Readonly<Record<InsiderImageVariant, ImageSpec>> = {
  heroDesktop: { label: 'Desktop image', width: 1600, height: 900, ratioTolerance: 0.25 },
  heroMobile: HERO_IMAGE_SPECS.mobile,
  story: { label: 'Story image', width: 800, height: 450, ratioTolerance: 0.25 },
  feature: { label: 'Feature image', width: 800, height: 600, ratioTolerance: 0.25 },
} as const;
