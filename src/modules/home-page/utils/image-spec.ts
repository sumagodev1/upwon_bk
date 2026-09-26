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

export type ImageSlot =
  | 'heroDesktop'
  | 'heroMobile'
  | 'trustLogo'
  | 'valuesCard'
  | 'integrationsLogo'
  | 'integrationsCentreLogo'
  | 'testimonialPoster'
  | 'ctaDesktop'
  | 'ctaMobile'
  | 'erpHero'
  | 'erpHeroMobile'
  | 'sfaHero'
  | 'sfaHeroMobile'
  | 'sfaCtaBackground'
  | 'sfaCtaDashboard'
  | 'sfaComplianceBackground'
  | 'sfaOutcomePortrait'
  | 'fmsHero'
  | 'fmsHeroMobile'
  | 'fmsCtaDesktop'
  | 'fmsCtaMobile'
  | 'erpCtaDesktop'
  | 'erpCtaMobile'
  | 'erpIndustry'
  | 'erpAvatar'
  | 'erpOutcome'
  | 'erpDashboard'
  | 'bakeryHero'
  | 'bakeryHeroMobile'
  | 'bakeryStatIcon'
  | 'bakeryPlatformIcon'
  | 'bakeryHelpVisual'
  | 'bakeryCtaDesktop'
  | 'bakeryCtaMobile'
  | 'fmcgHero'
  | 'fmcgHeroMobile'
  | 'fmcgPlatformIcon'
  | 'fmcgCtaDesktop'
  | 'fmcgCtaMobile'
  | 'sweetsHero'
  | 'sweetsHeroMobile'
  | 'sweetsPlatformIcon'
  | 'sweetsCtaDesktop'
  | 'sweetsCtaMobile'
  | 'foodProcessingHero'
  | 'foodProcessingHeroMobile'
  | 'foodProcessingTrustPanel'
  | 'foodProcessingPlatformIcon'
  | 'foodProcessingCoverage'
  | 'foodProcessingCtaDesktop'
  | 'foodProcessingCtaMobile'
  | 'nonFoodFmcgHero'
  | 'nonFoodFmcgHeroMobile'
  | 'nonFoodFmcgCapability'
  | 'nonFoodFmcgPlatformIcon'
  | 'nonFoodFmcgCoverageDashboard'
  | 'nonFoodFmcgCtaDesktop'
  | 'nonFoodFmcgCtaMobile'
  | 'dairyHero'
  | 'dairyHeroMobile'
  | 'dairyTrustStat'
  | 'dairyCapabilitiesPanel'
  | 'dairyPlatformIcon'
  | 'dairyBenefitsPanel'
  | 'dairyCoverage'
  | 'dairyCtaDesktop'
  | 'dairyCtaMobile';

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
  /*
   * The sixteen brand marks in public/images/platform_integration_client are
   * all 300-303px wide, with heights from 39 (Oracle) to 148 (SAP) - a ratio
   * spread of 2.0 to 7.7. That spread is why the ratio is not checked: the
   * badge renders object-contain inside a fixed box, so a squat roundel and a
   * long wordmark both come out correct, and a ratio rule would reject the
   * section's own artwork.
   *
   * Width is the rule that matters. The badge is 14.8% of the sphere, which
   * at the 640px cap is 95px, so 300px stays sharp past 2x DPR. The height
   * floor sits just under the shortest existing mark rather than at a round
   * number, so a re-export of the Oracle wordmark is not rejected on a
   * technicality while a thumbnail still is.
   */
  integrationsLogo: { label: 'Logo', width: 300, height: 36, ratioTolerance: null },
  /*
   * The mark at the core of the sphere - public/upwon-logo.png is 500x237.
   *
   * Rendered at 80% of a circle 28% of the sphere wide, so 143px at the cap;
   * 300px is the 2x size. object-contain again, so no ratio check: the core is
   * a glow behind whatever shape the mark is, not a frame that crops it.
   */
  integrationsCentreLogo: {
    label: 'Centre logo',
    width: 300,
    height: 140,
    ratioTolerance: null,
  },
  /*
   * The still behind a testimonial card, taken from the rendered box rather
   * than the current files.
   *
   * The card is 280px tall and either 280 or 576 wide - which one depends on
   * its position in the marquee's WIDE_PATTERN, not on anything the author
   * controls. So there is no single target ratio to check against: the same
   * photo is cropped to 1:1 in one slot and 2:1 in another, and a rule aimed
   * at either shape would be wrong for the other. Hence a null tolerance here
   * for a different reason than the logos have one - those are object-contain
   * and keep their shape; this is object-cover and will be cropped whatever
   * shape it is.
   *
   * The floor is the widest card at 2x DPR (1152x560) reconciled with the
   * eight posters the section ships, which are all 900 wide with heights from
   * 599 to 1350. 900 is what the existing content actually is; 560 is the
   * card's own height doubled. Anything smaller is visibly soft.
   */
  testimonialPoster: { label: 'Poster image', width: 900, height: 560, ratioTolerance: null },
  /*
   * The collage behind the report-download band, desktop half.
   *
   * public/images/home_cta.webp is 1600x566 - the same band as the hero
   * background, which is what it was cut from. Rendered bg-contain, so unlike
   * the hero it is never cropped: a differently shaped image just occupies
   * less of the left half. That is why there is no ratio rule here even though
   * the hero's identically sized slot has one.
   */
  ctaDesktop: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: null },
  /*
   * The same collage re-cut for phones - public/images/home_cta_mb.webp, at
   * 440x956.
   *
   * This one is bg-cover, so it does crop, and a landscape upload would lose
   * its top and bottom entirely. Hence a ratio rule where the desktop slot has
   * none. The floor is the shipped asset's own size rather than a 2x figure:
   * it is a background behind text, not detail anyone reads.
   */
  ctaMobile: { label: 'Mobile image', width: 440, height: 956, ratioTolerance: 0.2 },

  // ── ERP product page ────────────────────────────────────────────────────
  /*
   * The five slider backgrounds in public/images are all 1536x1024 - a clean
   * 3:2 - and the slider covers its box with them, so a differently shaped
   * upload is cropped rather than letterboxed. Ratio checked for that reason.
   */
  /*
   * The SFA-DMS slider. A wide banner, unlike the ERP page's 3:2 slides -
   * public/images/sfa_dms_hero1..6 are 1600x566, except hero4 at 1600x565,
   * which is why the minimum is 565.
   */
  sfaHero: { label: 'Desktop image', width: 1600, height: 565, ratioTolerance: 0.2 },
  sfaHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /* The closing band: sfa_dms_cta and sfa_dms_dashboard are both 1536x1024. */
  sfaCtaBackground: {
    label: 'Band background',
    width: 1536,
    height: 1024,
    ratioTolerance: 0.2,
  },
  sfaCtaDashboard: {
    label: 'Dashboard screenshot',
    width: 1536,
    height: 1024,
    ratioTolerance: 0.2,
  },
  /*
   * The artwork behind the compliance panel - public/images/built card
   * image.webp is 1432x904.
   *
   * Drawn bg-cover and anchored bg-right, with the badge column sitting over
   * its left two-thirds, so a differently shaped upload is cropped rather
   * than letterboxed and the part that shows is the right-hand side. Hence a
   * ratio rule, and a floor at the shipped asset rather than a round number.
   */
  // ── FMS product page ────────────────────────────────────────────────────
  /*
   * The slider banners - public/images/fms_hero1..4 are all 1600x566, the same
   * wide band the SFA-DMS and home heroes use. Covered, so a differently shaped
   * upload is cropped rather than letterboxed; hence the ratio rule.
   */
  fmsHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  fmsHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The closing band's artwork - public/images/CTA FMS.webp is 2116x743, and
   * the phone crop is 853x1844. Both bg-cover, so both crop and both carry a
   * ratio rule. The desktop art keeps its photograph on the left third with a
   * light panel on the right that the copy sits in, which is why a differently
   * shaped upload would put the text over the photo.
   */
  fmsCtaDesktop: { label: 'Desktop artwork', width: 2116, height: 743, ratioTolerance: 0.2 },
  fmsCtaMobile: { label: 'Mobile artwork', width: 853, height: 1844, ratioTolerance: 0.2 },

  /*
   * The portrait on an outcome card.
   *
   * No ratio rule, and a floor well under what the tile wants. The tile is a
   * square drawn with object-cover at up to 256px, so it really wants a
   * square around 512x512 - but the four portraits the section ships are
   * 148px-tall landscape thumbnails (192x148 to 270x148), and a rule the
   * live content cannot pass only blocks whoever replaces it. The floor is
   * the smallest shipped asset; the admin hint carries the recommendation.
   */
  sfaOutcomePortrait: {
    label: 'Portrait',
    width: 192,
    height: 148,
    ratioTolerance: null,
  },
  sfaComplianceBackground: {
    label: 'Panel artwork',
    width: 1432,
    height: 904,
    ratioTolerance: 0.2,
  },
  erpHero: { label: 'Slide background', width: 1536, height: 1024, ratioTolerance: 0.2 },
  /*
   * The phone crop of the same slide.
   *
   * Portrait, because a 3:2 photograph cropped into a tall viewport keeps its
   * middle and loses both ends. Same shape as the home page hero's mobile
   * image, so the two heroes want the same artwork from a designer.
   */
  erpHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
  },
  /*
   * public/images/erp_cta.webp is 1600x566, the same wide band as the home
   * hero. bg-cover here, not the home CTA's bg-contain, so this one does crop
   * and does carry a ratio rule.
   */
  erpCtaDesktop: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  /*
   * public/images/erp_cta_mobile.webp is 831x1891 - a tall crop of the same
   * artwork, also bg-cover.
   */
  erpCtaMobile: { label: 'Mobile image', width: 831, height: 1891, ratioTolerance: 0.2 },
  /*
   * The industry switcher's panel artwork - bakery.webp and its siblings are
   * 905px wide with heights from 678 to 859, a ratio spread of 1.05 to 1.33.
   * That spread is the reason there is no ratio rule: the set the section
   * ships is not consistent enough for one to be anything but a nuisance.
   */
  erpIndustry: { label: 'Industry image', width: 905, height: 600, ratioTolerance: null },
  /*
   * The portrait beside the benefits-journey proof.
   *
   * Drawn at 48x48 as a circle with object-cover, so anything far from square
   * loses its edges. The shipped set are 200px square crops, which is the
   * smallest that still looks clean on a high-density screen.
   */
  erpAvatar: { label: 'Portrait', width: 200, height: 200, ratioTolerance: 0.2 },
  /*
   * The photograph down the side of an outcome card.
   *
   * No ratio rule, unusually for a cover crop: the same file is drawn as a
   * tall panel beside the text on desktop and as a short full-width banner on
   * mobile, so there is no one shape that suits both and a rule tuned to
   * either would reject images that look right on the other.
   */
  erpOutcome: { label: 'Card photograph', width: 900, height: 600, ratioTolerance: null },
  /*
   * The dashboard mockup - public/images/dashboard.webp is 1448x1086, a 4:3.
   *
   * Drawn as a background at 112% width and panned vertically as the visitor
   * scrolls, so it is cropped on every axis and a very different shape would
   * pan through empty space. Hence a ratio rule, unlike the industry photos
   * beside it, which are shown whole.
   */
  erpDashboard: { label: 'Dashboard image', width: 1448, height: 1086, ratioTolerance: 0.2 },

  // ── Bakery & Confectionery industry page ────────────────────────────────
  /*
   * The slider banners - public/images/bakertandconfenary1..3 are all
   * 1600x566, the same wide band the FMS and home heroes use. Covered, so a
   * differently shaped upload is cropped; hence the ratio rule.
   */
  bakeryHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  bakeryHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The round illustration above each trust figure - the shipped set runs from
   * 210x207 to 247x247. Drawn as a 64px circle with object-cover, so anything
   * far from square loses its edges; the floor sits just under the smallest.
   */
  bakeryStatIcon: { label: 'Icon', width: 200, height: 200, ratioTolerance: 0.25 },
  /*
   * The product mark in a platform tile - ERP.webp and its siblings are 222px
   * wide with heights from 184 to 215. object-contain, so no ratio rule.
   */
  bakeryPlatformIcon: { label: 'Tile icon', width: 200, height: 180, ratioTolerance: null },
  /*
   * The "How UpWON helps" diagram - public/images/how_UpWon_helps.webp is
   * 1619x971. Drawn full width at its natural height, so it is never cropped,
   * but a very different shape would change the section's whole proportion.
   */
  bakeryHelpVisual: { label: 'Diagram', width: 1600, height: 960, ratioTolerance: 0.25 },
  /*
   * The closing band - public/images/bake_cta_back.webp is 1600x565 and the
   * phone crop bake_mb_cta.webp is 822x1914. Both object-cover, so both crop.
   */
  bakeryCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 565, ratioTolerance: 0.2 },
  bakeryCtaMobile: { label: 'Mobile artwork', width: 822, height: 1914, ratioTolerance: 0.2 },

  // ── FMCG Distribution industry page ─────────────────────────────────────
  /*
   * The slider banners - move_product_faster.webp and its three siblings run
   * from 1774x887 to 1829x860, a 2:1 band. Covered, so a differently shaped
   * upload is cropped; hence the ratio rule.
   */
  fmcgHero: { label: 'Desktop image', width: 1600, height: 800, ratioTolerance: 0.2 },
  fmcgHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  // The same product marks as the bakery page's tiles, drawn the same way.
  fmcgPlatformIcon: { label: 'Tile icon', width: 200, height: 180, ratioTolerance: null },
  /*
   * The closing band - public/images/fmcg_cta_sec.webp is 1983x793. Covered
   * and anchored top, with the copy over its empty left panel.
   */
  fmcgCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 640, ratioTolerance: 0.2 },
  /*
   * The phone banner above the copy. Optional - without one the page crops
   * the desktop artwork into it - and any shape, since it is a 230px-tall
   * cover crop at whatever width the phone is.
   */
  fmcgCtaMobile: { label: 'Mobile artwork', width: 800, height: 460, ratioTolerance: null },

  // ── Sweets & Namkeen industry page ──────────────────────────────────────
  /*
   * The slider banners - public/images/sweet_hero_1..3 are 1600x566, the same
   * wide band the bakery and home heroes use. Covered, so the ratio rule.
   */
  sweetsHero: { label: 'Desktop image', width: 1600, height: 565, ratioTolerance: 0.2 },
  sweetsHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  // The same product marks as the other industry pages' tiles.
  sweetsPlatformIcon: { label: 'Tile icon', width: 200, height: 180, ratioTolerance: null },
  /*
   * The closing band - sweet_cta_desktop.webp is 1774x887, a 2:1 band with
   * the copy over its empty left panel; sweet_cta_mobile.webp is a 468x984
   * portrait, cropped from the top into the phone banner. Both covered.
   */
  sweetsCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 800, ratioTolerance: 0.2 },
  sweetsCtaMobile: { label: 'Mobile artwork', width: 460, height: 960, ratioTolerance: 0.2 },

  // ── Food Processing industry page ───────────────────────────────────────
  // food_process_hero_1..4 are 1600x566 - the same covered band as the others.
  foodProcessingHero: { label: 'Desktop image', width: 1600, height: 565, ratioTolerance: 0.2 },
  foodProcessingHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The photograph beside the trust figures - food_process_proof_strip.webp is
   * 1672x941. Covered into a column whose height follows the copy, so no one
   * shape fits and there is no ratio rule.
   */
  foodProcessingTrustPanel: { label: 'Photograph', width: 800, height: 450, ratioTolerance: null },
  foodProcessingPlatformIcon: { label: 'Tile icon', width: 200, height: 180, ratioTolerance: null },
  /*
   * A coverage category's illustration - the shipped set runs 1536x1024 to
   * 1672x941, drawn object-contain at 96px tall. No ratio rule.
   */
  foodProcessingCoverage: { label: 'Category art', width: 400, height: 260, ratioTolerance: null },
  /*
   * The closing band - food_process_cta.webp is 1600x567, drawn at its natural
   * height with the copy over its left panel; the phone crop is 440x820.
   */
  foodProcessingCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 565, ratioTolerance: 0.2 },
  foodProcessingCtaMobile: { label: 'Mobile artwork', width: 440, height: 820, ratioTolerance: 0.2 },

  // ── Non-Food FMCG industry page ─────────────────────────────────────────
  nonFoodFmcgHero: { label: 'Desktop image', width: 1600, height: 565, ratioTolerance: 0.2 },
  nonFoodFmcgHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * A capability card's illustration - the shipped set are 338px tall and
   * 350-456 wide, drawn object-contain in a 112px frame. No ratio rule.
   */
  nonFoodFmcgCapability: { label: 'Card illustration', width: 300, height: 280, ratioTolerance: null },
  nonFoodFmcgPlatformIcon: { label: 'Tile icon', width: 200, height: 180, ratioTolerance: null },
  /*
   * The dashboard in the coverage section - industry_cov_dashboard.webp is
   * 1598x984, drawn full width at its natural height.
   */
  nonFoodFmcgCoverageDashboard: { label: 'Dashboard image', width: 1200, height: 740, ratioTolerance: 0.2 },
  nonFoodFmcgCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 565, ratioTolerance: 0.2 },
  // non_fmcg_cta_mobile.webp is 440x954.
  nonFoodFmcgCtaMobile: { label: 'Mobile artwork', width: 440, height: 950, ratioTolerance: 0.2 },

  // ── Dairy & Ice Cream industry page ─────────────────────────────────────
  // dairy_hero_* are 1600x566-569 - the same covered band as the others.
  dairyHero: { label: 'Desktop image', width: 1600, height: 565, ratioTolerance: 0.2 },
  dairyHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The photograph shown with a trust figure - the shipped three run 1254x1254
   * to 1409x1117, covered into the card's photo column. No ratio rule.
   */
  dairyTrustStat: { label: 'Photograph', width: 800, height: 640, ratioTolerance: null },
  /*
   * The collage beside the capability cards - dairy_capabilities.webp is
   * 1231x1277, drawn at its natural ratio.
   */
  dairyCapabilitiesPanel: { label: 'Collage image', width: 900, height: 930, ratioTolerance: 0.2 },
  dairyPlatformIcon: { label: 'Tile icon', width: 200, height: 180, ratioTolerance: null },
  // The image beside the benefits - dairy_benefits_sec.webp is 1536x1024.
  dairyBenefitsPanel: { label: 'Section image', width: 1200, height: 800, ratioTolerance: 0.2 },
  /*
   * A coverage category's photograph - the shipped set are 1536x1024 and
   * 1448x1086, covered into the scrolling cards. No ratio rule.
   */
  dairyCoverage: { label: 'Category image', width: 600, height: 400, ratioTolerance: null },
  // The closing band - dairy_cta_desktop.webp is 1600x566, the phone crop 440x956.
  dairyCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 565, ratioTolerance: 0.2 },
  dairyCtaMobile: { label: 'Mobile artwork', width: 440, height: 950, ratioTolerance: 0.2 },
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
