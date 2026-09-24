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
  | 'fmsFranchiseIcon'
  | 'fmsFranchisePhoto'
  | 'fmsOutcomeLogo'
  | 'fmsOutcomePhoto'
  | 'erpCtaDesktop'
  | 'erpCtaMobile'
  | 'erpIndustry'
  | 'erpAvatar'
  | 'erpOutcome'
  | 'erpDashboard';

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
   * A franchise category's tab pictogram.
   *
   * No ratio rule: it is drawn object-contain into a 32px square, so a tall
   * or wide mark simply letterboxes inside the tile rather than distorting.
   * The four shipped pictograms bear that out - they range from 701x1024 to
   * 1006x949 and all sit correctly. The floor is four times the drawn size,
   * which is what a high-density screen needs; the admin hint carries the
   * 512x512 square the shipped set uses.
   */
  fmsFranchiseIcon: { label: 'Tab icon', width: 128, height: 128, ratioTolerance: null },
  /*
   * The photograph behind the selected-category panel - the four shipped are
   * all exactly 1504x873. Drawn bg-cover with a tint wash fading out across
   * the left two-thirds, so a differently shaped upload crops; hence the ratio
   * rule, and hence a floor at the shipped size rather than below it.
   */
  fmsFranchisePhoto: { label: 'Panel photo', width: 1504, height: 873, ratioTolerance: 0.2 },
  /*
   * A network's brand mark on the outcome card.
   *
   * No ratio rule: it is drawn object-contain at a fixed height with a width
   * cap, so a wordmark and a round badge both sit correctly - which the two
   * shipped marks bear out, at 500x110 and 500x492. The floor is generous
   * against the 32px draw height; the admin hint carries the recommendation.
   */
  fmsOutcomeLogo: { label: 'Brand mark', width: 200, height: 32, ratioTolerance: null },
  /*
   * The photograph behind the card - public/images/fms_hero1 and _hero2 are
   * both 1600x566. Drawn object-cover across the full width with the card
   * floating over its right-hand side, so a differently shaped upload crops;
   * hence the ratio rule, and hence keeping the subject left of centre.
   */
  fmsOutcomePhoto: { label: 'Background photo', width: 1600, height: 566, ratioTolerance: 0.2 },

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
