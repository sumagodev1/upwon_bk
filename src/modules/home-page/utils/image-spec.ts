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
  | 'hreasyHero'
  | 'hreasyHeroMobile'
  | 'hreasyCtaBanner'
  | 'hreasyCapabilityPanel'
  | 'hreasyLifecycleCard'
  | 'hreasyOutcomeLogo'
  | 'wmsHero'
  | 'wmsHeroMobile'
  | 'wmsCtaDesktop'
  | 'wmsCtaMobile'
  | 'wmsProofSlide'
  | 'wmsRecognitionCard'
  | 'wmsCapabilityPanel'
  | 'vmsHero'
  | 'vmsHeroMobile'
  | 'vmsProofImage'
  | 'vmsCapabilityImage'
  | 'vmsOutcomePoster'
  | 'vmsCtaDesktop'
  | 'vmsCtaMobile'
  | 'posOutcomeLogo'
  | 'posOutcomePhoto'
  | 'posSecurityShield'
  | 'posSecurityIllustration'
  | 'posHero'
  | 'posHeroMobile'
  | 'posCtaDesktop'
  | 'posCtaMobile'
  | 'engineeringHero'
  | 'engineeringHeroMobile'
  | 'engineeringPlatform'
  | 'engineeringCoverage'
  | 'engineeringCtaDesktop'
  | 'engineeringCtaMobile'
  | 'beverageHero'
  | 'beverageHeroMobile'
  | 'beverageTrustPhoto'
  | 'beverageCapabilitiesBackground'
  | 'beverageCapabilityScreenshot'
  | 'beveragePlatformBackground'
  | 'beverageCtaDesktop'
  | 'beverageCtaMobile'
  | 'spicesAgroHero'
  | 'spicesAgroHeroMobile'
  | 'spicesAgroTrustPanel'
  | 'spicesAgroCapabilitiesBackground'
  | 'spicesAgroPlatformBackground'
  | 'spicesAgroCoverageTile'
  | 'spicesAgroCtaDesktop'
  | 'spicesAgroCtaMobile'
  | 'qsrFranchiseHero'
  | 'qsrFranchiseHeroMobile'
  | 'qsrFranchiseTrustPhoto'
  | 'qsrFranchiseCapabilitiesArtwork'
  | 'qsrFranchisePlatformArtwork'
  | 'qsrFranchiseCoveragePhoto'
  | 'qsrFranchiseCtaDesktop'
  | 'qsrFranchiseCtaMobile'
  | 'whyUpwonHeroDesktop'
  | 'whyUpwonHeroMobile'
  | 'whyUpwonIndustryPhoto'
  | 'whyUpwonProofArtwork'
  | 'whyUpwonResultsHub'
  | 'whyUpwonCtaDesktop'
  | 'whyUpwonCtaMobile'
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
   * The POS slider banners - public/images/pos_hero1..5 are all 1600x566, the
   * same wide band the FMS and SFA-DMS heroes use. Covered, so a differently
   * shaped upload is cropped rather than letterboxed; hence the ratio rule.
   */
  /*
   * The compliance shield between the two badge columns.
   * public/images/Compliant by design.webp is 402x373 - very nearly square.
   * Drawn contained at a fixed width, so the ratio matters but the exact
   * pixel count does not.
   */
  /*
   * The brand mark on a card. Drawn object-contain at a fixed height, so the
   * width is what matters and the shape does not - hence no ratio rule.
   */
  // The slider's backgrounds, the same crop every product hero uses.
  hreasyHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  hreasyHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The closing band's banner. One image, not a pair: the band centres its
   * copy over a full-width cover crop, so the same file serves both viewports.
   */
  hreasyCtaBanner: { label: 'Banner image', width: 1600, height: 566, ratioTolerance: 0.2 },
  /*
   * A capability panel's artwork - the composite carrying that stage's
   * dashboard mock, photograph and flow.
   *
   * No ratio rule: the seven composites the section ships are a landscape
   * card each, but each holds a different mock and they do not agree on a
   * height, so a rule tight enough to be useful would reject artwork that
   * renders correctly. It is drawn contained inside the panel, so a taller
   * or shorter one just occupies less of the card's width. The floor is a 2x
   * figure for the panel at its widest.
   */
  hreasyCapabilityPanel: {
    label: 'Panel artwork',
    width: 1200,
    height: 800,
    ratioTolerance: null,
  },
  /*
   * The photograph at the top of a capability card.
   *
   * Drawn object-cover into a 4:3 box, so a differently shaped upload is
   * cropped on one axis - hence a ratio rule here, where the switcher's
   * contained panel needs none. 800x600 is the 2x size of the card at its
   * widest column.
   */
  hreasyLifecycleCard: {
    label: 'Card photograph',
    width: 800,
    height: 600,
    ratioTolerance: 0.2,
  },
  /*
   * The brand mark on an outcome card.
   *
   * No ratio rule: it is drawn object-contain at a fixed height, so a
   * wordmark and a roundel both render correctly and a rule would reject
   * valid artwork for no benefit. The floor is a 2x figure for the 130px box
   * the card draws it in.
   */
  hreasyOutcomeLogo: { label: 'Brand mark', width: 260, height: 56, ratioTolerance: null },

  // The WMS slider's backgrounds, the same wide crop every product hero uses.
  wmsHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  wmsHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The closing band's photograph and its phone crop.
   *
   * A pair, unlike the HREasy band's single banner: this design lays its copy
   * over the left of a landscape photograph, and that crop keeps nothing
   * readable on a phone. Both are drawn object-cover, so both carry a ratio
   * rule - a differently shaped upload would put the text over the subject.
   */
  wmsCtaDesktop: { label: 'Desktop photograph', width: 1600, height: 900, ratioTolerance: 0.2 },
  wmsCtaMobile: { label: 'Mobile photograph', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * One stat card in the proof row. Drawn object-cover into an 11:8 frame, so
   * a differently shaped upload is cropped and the figure baked into it can
   * lose an edge - hence a ratio rule. 1100x800 is that frame at 2x.
   */
  wmsProofSlide: { label: 'Stat card', width: 1100, height: 800, ratioTolerance: 0.2 },
  /*
   * The illustration at the top of a warehouse-type card.
   *
   * No ratio rule, unlike the stat card directly above it: this one is drawn
   * object-contain in a fixed band with the title underneath, so a squarer or
   * wider illustration letterboxes inside the band rather than being cropped.
   * The seven shipped illustrations bear that out - they are a mix of square
   * and landscape compositions and all sit correctly. The floor is roughly 2x
   * the band at its widest column, which is what keeps line art crisp on a
   * high-density screen.
   */
  wmsRecognitionCard: {
    label: 'Card illustration',
    width: 600,
    height: 400,
    ratioTolerance: null,
  },
  /*
   * The artwork beside a capability band - the composite carrying that
   * capability's dashboard mock, photograph and caption strip.
   *
   * No ratio rule, for the same reason the HREasy panel above carries none:
   * the seven composites are each a landscape card, but they hold different
   * mocks and do not agree on a height, so a rule tight enough to be useful
   * would reject artwork that renders correctly. It is drawn contained in the
   * band, so a taller or shorter one occupies less of the band's width. The
   * floor is a 2x figure for the band at its widest.
   */
  wmsCapabilityPanel: {
    label: 'Panel artwork',
    width: 1200,
    height: 700,
    ratioTolerance: null,
  },

  // ── Vendor Portal (VMS) page ────────────────────────────────────────────
  /*
   * The slider's backgrounds.
   *
   * No ratio rule, unusually for a covered hero. The five shipped slides do
   * not agree on a shape: vms_deliver_quality and vms_quality_score are
   * 1536x1024 and vms_one_dashboard is 1549x1015 - all about 3:2 - but
   * vms_quote is 1727x911, which is nearly 2:1. A rule tight enough to be
   * useful rejects one group or the other, and rejecting the section's own
   * artwork only blocks whoever replaces it. The floor sits under the
   * smallest of them on each axis.
   */
  vmsHero: { label: 'Desktop image', width: 1500, height: 880, ratioTolerance: null },
  // Portrait, for the <picture> source phones actually download.
  vmsHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * A picture tile in the proof bento.
   *
   * The two shipped tiles are 1774x887 and 1744x902 - both very close to 2:1,
   * even though one occupies seven of the twelve columns and the other five.
   * So there is a target shape after all, and since the tile covers its box a
   * portrait upload would be cropped to a strip; hence a ratio rule.
   */
  vmsProofImage: { label: 'Tile picture', width: 1700, height: 880, ratioTolerance: 0.2 },
  /*
   * A capability card's screenshot. The carousel draws every card at one size
   * and covers it, so the shape does matter here.
   *
   * The seven shipped screenshots run 1692x930 to 1840x854 - a ratio spread
   * of 1.82 to 2.15, tight enough for a rule but not for a tight one. The
   * target is the middle of that spread rather than a rounder number, and the
   * floor sits under the smallest on each axis so no shipped card fails on a
   * technicality.
   */
  vmsCapabilityImage: {
    label: 'Card screenshot',
    width: 1600,
    height: 850,
    ratioTolerance: 0.2,
  },
  /*
   * The still behind a showcase video before it plays. Fills the player, so
   * it wants the player's shape - 16:9, the ratio the films themselves are.
   * No shipped example to measure: the section has no posters today.
   */
  vmsOutcomePoster: { label: 'Poster image', width: 1280, height: 720, ratioTolerance: 0.2 },
  /*
   * The closing band's photograph and its phone crop - vms_final_cta.webp is
   * 2109x746 and vms_cta_mobile.webp is 440x956.
   *
   * The desktop art is drawn at its own height with the copy laid over its
   * left third, so a differently shaped upload moves the text off the clear
   * part of the picture; the phone crop is a tall recut of the same scene.
   * Both carry a ratio rule for that reason, and both floors are the shipped
   * asset's own size - the mobile one is a background behind text, not detail
   * anyone reads, so there is no point demanding a 2x figure it has never met.
   */
  vmsCtaDesktop: { label: 'Desktop photograph', width: 2100, height: 740, ratioTolerance: 0.2 },
  vmsCtaMobile: { label: 'Mobile photograph', width: 440, height: 956, ratioTolerance: 0.2 },
  posOutcomeLogo: { label: 'Brand mark', width: 200, height: 32, ratioTolerance: null },
  /*
   * The photograph filling the card's left panel, drawn object-cover - so a
   * very different shape would be cropped hard. Matches the hero art the
   * cards borrow today.
   */
  posOutcomePhoto: { label: 'Photograph', width: 1600, height: 566, ratioTolerance: 0.2 },
  posSecurityShield: { label: 'Shield image', width: 402, height: 373, ratioTolerance: 0.2 },
  /*
   * The two illustrations flanking the data-ownership strip.
   * public/images/sec_comp.webp is 1469x998 and layer.webp is 1486x986 - the
   * same landscape shape, drawn at the same width, so one slot serves both.
   */
  posSecurityIllustration: {
    label: 'Illustration',
    width: 1400,
    height: 950,
    ratioTolerance: 0.2,
  },
  posHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  posHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The closing band's artwork - public/images/cta_pos_desktop.webp is
   * 1600x566 and the phone crop is 828x1899. Both bg-cover, so both crop and
   * both carry a ratio rule. The desktop art keeps its counter mockup on the
   * left with the copy over the wash on the right, which is why a differently
   * shaped upload would put the text over the mockup.
   */
  posCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 566, ratioTolerance: 0.2 },
  posCtaMobile: { label: 'Mobile artwork', width: 828, height: 1899, ratioTolerance: 0.2 },

  /*
   * The Engineering & Manufacturing slider banners - public/images/eng_hero_*
   * are all 1600x566 (one is 1600x565), the same wide band the product-page
   * heroes use. Covered, so a differently shaped upload is cropped; hence the
   * ratio rule.
   */
  engineeringHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  engineeringHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The connected platform section's centre illustration -
   * public/images/eng_how_upwon.webp is 1536x1024. Drawn at its own ratio
   * between the copy and the workflow list, so a differently shaped upload
   * would push the list out of line; hence the ratio rule.
   */
  engineeringPlatform: { label: 'Illustration', width: 1536, height: 1024, ratioTolerance: 0.2 },
  /*
   * The industry coverage section's background - public/images/
   * eng_indust_cover.webp is 1536x1024, drawn at its own ratio behind the copy
   * on the right, so a differently shaped upload would reach further into the
   * grid; hence the ratio rule.
   */
  engineeringCoverage: { label: 'Background illustration', width: 1536, height: 1024, ratioTolerance: 0.2 },
  /*
   * The closing band's artwork - public/images/eng_desktop_cta.webp is
   * 1600x599 and drawn at its own ratio with the copy laid over its empty left
   * panel, so a differently shaped upload would move the panel out from under
   * the copy; hence the ratio rule. The phone crop, eng_mobile_cta.webp, is
   * 440x956, covered into a banner above the copy.
   */
  engineeringCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 599, ratioTolerance: 0.2 },
  engineeringCtaMobile: { label: 'Mobile artwork', width: 440, height: 956, ratioTolerance: 0.2 },

  /*
   * The Beverages & Juices slider banners - public/images/bev_* hero slides
   * are all 1600x566, the same band as the Engineering page's. Covered, so a
   * differently shaped upload is cropped; hence the ratio rule.
   */
  beverageHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  beverageHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The photo behind a figure on the trust section's stat card. The card is a
   * short box on phones and a tall one beside the marquee on desktop, both
   * object-cover, so no one ratio fits - only a floor that stays sharp at the
   * desktop size.
   */
  beverageTrustPhoto: { label: 'Photo', width: 600, height: 400, ratioTolerance: null },
  /*
   * The core capabilities section. Its background - bev_core_capability_bg.webp,
   * 1600x566 - covers the whole section, whose height follows the content, so
   * no one ratio fits; only a floor. The screenshots - bev_* at about 1580x1000
   * - sit in a fixed 1580:1000 frame with object-cover, so a differently shaped
   * one is cropped; hence the ratio rule there.
   */
  beverageCapabilitiesBackground: {
    label: 'Background',
    width: 1200,
    height: 400,
    ratioTolerance: null,
  },
  beverageCapabilityScreenshot: {
    label: 'Screenshot',
    width: 1200,
    height: 760,
    ratioTolerance: 0.2,
  },
  /*
   * The connected platform section's background - bev_how_upwon_help_bg.webp,
   * 1600x566. It covers the whole section anchored on its right, where the
   * artwork carries its subject, and the section's height follows its content;
   * so only a floor, no ratio rule.
   */
  beveragePlatformBackground: {
    label: 'Background',
    width: 1200,
    height: 400,
    ratioTolerance: null,
  },
  /*
   * The closing band's artwork. bev_desktop_cta.webp is 2111x745 - the same
   * wide band as the Engineering page's, at a higher resolution - drawn at its
   * own ratio with the copy over its empty left panel; hence the ratio rule.
   * The phone crop, bev_mobile_cta.webp, is 848x1854, covered into a banner
   * above the copy. The floors are the shipped shapes at a sensible minimum.
   */
  beverageCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 565, ratioTolerance: 0.2 },
  beverageCtaMobile: { label: 'Mobile artwork', width: 424, height: 927, ratioTolerance: 0.2 },

  /*
   * The Spices & Agro Processing slider banners - public/images/agro_* hero
   * slides are all about 1600x566, the same band as the other industry pages'.
   * Covered, so a differently shaped upload is cropped; hence the ratio rule.
   */
  spicesAgroHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  spicesAgroHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The trust section's product screenshot - agro_proof_strip.webp is
   * 1536x1024, drawn at its own ratio up to 1100px wide under the marquee, so
   * a differently shaped upload would change the section's height; hence the
   * ratio rule, with a floor at that drawn width.
   */
  spicesAgroTrustPanel: { label: 'Screenshot', width: 1100, height: 733, ratioTolerance: 0.2 },
  /*
   * The core capabilities section's background - agro_core_capability_back.webp,
   * 1600x571 - covers the whole section around the dark panel, and the
   * section's height follows its content; so only a floor, no ratio rule.
   */
  spicesAgroCapabilitiesBackground: {
    label: 'Background',
    width: 1200,
    height: 400,
    ratioTolerance: null,
  },
  /*
   * The connected platform section's background - agro_how_upwon_bg.webp -
   * covers the whole section behind the heading and the cards; the section's
   * height follows its content, so only a floor, no ratio rule.
   */
  spicesAgroPlatformBackground: {
    label: 'Background',
    width: 1200,
    height: 400,
    ratioTolerance: null,
  },
  /*
   * An industry coverage tile - the agro_indust_* photos run about 356-404 by
   * 318-373 and are cropped into a circle up to 132px across. So a roughly
   * square floor sharp at twice that size, with a loose ratio rule: the circle
   * takes the middle, and a long thin photo would lose its subject.
   */
  spicesAgroCoverageTile: { label: 'Photo', width: 264, height: 264, ratioTolerance: 0.3 },
  /*
   * The closing band's artwork - agro_desktop_cta.webp is 1600x570, drawn at
   * its own ratio with the copy over its empty left panel; hence the ratio
   * rule. The phone crop, agro_mobile_cta.webp, is 440x956, covered into a
   * banner above the copy - the same sizes as the Engineering page's band.
   */
  spicesAgroCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 570, ratioTolerance: 0.2 },
  spicesAgroCtaMobile: { label: 'Mobile artwork', width: 440, height: 956, ratioTolerance: 0.2 },

  /*
   * The QSR & Franchise F&B slider banners - public/images/qsr_hero_* are all
   * 3200x1132, the same 1600x566 band as the other industry pages' at 2x.
   * Covered, so a differently shaped upload is cropped; hence the ratio rule.
   */
  qsrFranchiseHero: { label: 'Desktop image', width: 1600, height: 566, ratioTolerance: 0.2 },
  qsrFranchiseHeroMobile: { label: 'Mobile image', width: 800, height: 1200, ratioTolerance: 0.2 },
  /*
   * The trust mosaic's two photographs - qsr_proof_strip1.webp is 1537x1023 and
   * qsr_proof_strip2.webp 1624x968. Both are covered into tiles whose shape
   * changes with the viewport, so there is no ratio to hold; only a floor.
   */
  qsrFranchiseTrustPhoto: { label: 'Photo', width: 800, height: 600, ratioTolerance: null },
  /*
   * The core capabilities artwork - qsr_core_capabilities.webp is 1041x1511,
   * drawn at its own shape beside the cards; hence the ratio rule.
   */
  qsrFranchiseCapabilitiesArtwork: {
    label: 'Artwork',
    width: 700,
    height: 1016,
    ratioTolerance: 0.2,
  },
  /*
   * The connected platform's app artwork - qsr_how_upwon_help.webp is
   * 632x1024, drawn at its own shape beside the copy; hence the ratio rule.
   */
  qsrFranchisePlatformArtwork: {
    label: 'Artwork',
    width: 600,
    height: 972,
    ratioTolerance: 0.2,
  },
  /*
   * The industry coverage cards' photos - the shipped ones run from 336x304 to
   * 412x246, covered into a 206x150 frame, so there is no ratio to hold; only
   * a floor.
   */
  qsrFranchiseCoveragePhoto: { label: 'Photo', width: 300, height: 220, ratioTolerance: null },
  /*
   * The closing band's artwork - qsr_cta_sec_desktop.webp is 2151x731, drawn at
   * its own ratio with the copy over its empty left panel; hence the ratio
   * rule. The phone crop, qsr_cta_sec_mobile.webp, is 440x956, covered into a
   * banner above the copy.
   */
  qsrFranchiseCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 544, ratioTolerance: 0.2 },
  qsrFranchiseCtaMobile: { label: 'Mobile artwork', width: 440, height: 956, ratioTolerance: 0.2 },

  /*
   * The Why UpWon hero's artwork - why_hero_desktop.webp is 1983x793 (2.5:1),
   * and the section takes the artwork's own ratio from 1024px up with the copy
   * over its empty left half; why_hero_mobile.webp is 944x1665, covered from the
   * top with the copy under the laptop. Hence the ratio rules.
   */
  whyUpwonHeroDesktop: { label: 'Desktop artwork', width: 1600, height: 640, ratioTolerance: 0.2 },
  whyUpwonHeroMobile: { label: 'Mobile artwork', width: 600, height: 1058, ratioTolerance: 0.2 },
  /*
   * The industry trust cards' photos - the shipped ones are about 300x441,
   * covered into a frame 150px tall whose width follows the grid, so there is
   * no ratio to hold; only a floor.
   */
  whyUpwonIndustryPhoto: { label: 'Photo', width: 280, height: 220, ratioTolerance: null },
  /*
   * The product proof artwork - why_product_proof.webp is 1536x1024 (3:2). The
   * callouts are pinned to the connectors drawn into it by percentage, so a
   * different shape would move them off their dots; hence the ratio rule.
   */
  whyUpwonProofArtwork: { label: 'Artwork', width: 1200, height: 800, ratioTolerance: 0.1 },
  /*
   * The results section's hub artwork - why_conn_workflow.webp is 1263x1246,
   * near-square, drawn up to 300px wide in the third card; hence the ratio rule.
   */
  whyUpwonResultsHub: { label: 'Hub artwork', width: 600, height: 600, ratioTolerance: 0.15 },
  /*
   * The closing band's artwork - why_cta_desktop.webp is 2109x746, drawn at its
   * own ratio with the copy over the dark panel left of the laptop; the phone
   * crop, why_cta_mobile.webp, is 851x1848 with the copy in the dark space under
   * the laptop. Hence the ratio rules.
   */
  whyUpwonCtaDesktop: { label: 'Desktop artwork', width: 1600, height: 566, ratioTolerance: 0.2 },
  whyUpwonCtaMobile: { label: 'Mobile artwork', width: 600, height: 1303, ratioTolerance: 0.2 },

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

/**
 * The two hero viewports under the names the Insider, Contact, About and
 * Partner spec tables reuse them by.
 *
 * Those pages each carry their own slot table, so they cannot key into
 * ImageSlot - they borrow the hero's measurements by value instead. Kept as a
 * view onto IMAGE_SPECS rather than a second copy of the numbers, so changing
 * the hero crop changes every page that inherits it.
 */
export type HeroImageVariant = 'desktop' | 'mobile';

export const HERO_IMAGE_SPECS: Readonly<Record<HeroImageVariant, ImageSpec>> = {
  desktop: IMAGE_SPECS.heroDesktop,
  mobile: IMAGE_SPECS.heroMobile,
};

/**
 * A slot name or the spec itself.
 *
 * Home and the product pages name a slot, because every slot they use is in
 * ImageSlot. The pages merged from keshav_backend hold their own tables and
 * pass the spec directly. Both are accepted so neither has to translate.
 */
export type ImageSpecRef = ImageSlot | ImageSpec;

const resolveSpec = (ref: ImageSpecRef): ImageSpec =>
  typeof ref === 'string' ? IMAGE_SPECS[ref] : ref;

export const describeImageSpec = (ref: ImageSpecRef): string => {
  const spec = resolveSpec(ref);
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
  ref: ImageSpecRef,
  dimensions: ImageDimensions,
): string | null {
  const spec = resolveSpec(ref);

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
