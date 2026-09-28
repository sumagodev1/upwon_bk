// src/modules/clients-page/utils/clients-image-spec.ts

import { IMAGE_SPECS, ImageSpec } from '../../home-page/utils/image-spec';
import { INSIDER_IMAGE_SPECS } from '../../insider-page/utils/insider-image-spec';

/**
 * What each Clients page image slot has to be.
 *
 * The Clients hero renders through the same HeroSlider with the same
 * min-h-[520px]/[560px]/[620px] content box and pt-32/pt-40 padding as the
 * Insider hero, so its image lands in exactly the same band - the Insider
 * hero specs are reused rather than restated, and change together.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type ClientsImageVariant =
  | 'heroDesktop'
  | 'heroMobile'
  | 'rosterLogo'
  | 'testimonialAvatar';

export const CLIENTS_IMAGE_SPECS: Readonly<Record<ClientsImageVariant, ImageSpec>> = {
  heroDesktop: INSIDER_IMAGE_SPECS.heroDesktop,
  heroMobile: INSIDER_IMAGE_SPECS.heroMobile,
  // The roster marquee draws logos exactly as the home trust strip does
  // (object-contain at a fixed height), so the home trust logo rule applies.
  rosterLogo: IMAGE_SPECS.trustLogo,
  // A 44px circle (h-11 w-11, object-cover): square-ish, and 120px covers
  // it at 2x with room to spare. The seeded Unsplash portraits are 200px.
  testimonialAvatar: { label: 'Photo', width: 120, height: 120, ratioTolerance: 0.25 },
} as const;
