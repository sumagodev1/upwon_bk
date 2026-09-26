// src/modules/about-page/utils/about-image-spec.ts

import { HERO_IMAGE_SPECS, ImageSpec } from '../../home-page/utils/image-spec';

/**
 * What each image slot on the About page has to be. Checked by the same
 * checkImageDimensions as the home hero, the Contact hero and the Partner
 * Program hero, so the rules and the error wording are identical everywhere -
 * only the numbers differ, and every number below is read off what the
 * component actually renders.
 *
 * Four slots, six uses: the hero's rotating backdrops and their optional phone
 * crops, the founder's portrait and the team headshots (one spec - they are the
 * same picture in two sizes of the same circle), and the closing CTA banner with
 * its own optional narrow-layout crop.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

/**
 * The entity types the admin panel must tag each slot's uploads with.
 *
 * Not decoration: assertUsableImageFile refuses a file id whose entity type is
 * not on PUBLIC_FILE_ENTITY_TYPES, because /public/files would refuse to serve it
 * to an anonymous browser and the section would save with an image the site
 * cannot load. These four are the About page's entries on that list, one per
 * SECTION rather than one per crop: the hero's desktop and phone backdrops both
 * upload as about_hero, and the CTA's wide banner and its narrow-layout crop both
 * as about_cta. A pair is two shapes of one section's artwork, and tagging them
 * apart would buy nothing - the entity type decides only whether /public/files
 * will serve the asset, which is the same answer for both. See
 * config/constants.ts.
 */
export const ABOUT_ENTITY_TYPES = {
  hero: 'about_hero',
  founder: 'about_founder',
  teamMember: 'about_team_member',
  cta: 'about_cta',
} as const;

export type AboutImageVariant = 'hero' | 'heroMobile' | 'portrait' | 'cta' | 'ctaMobile';

export const ABOUT_IMAGE_SPECS: Readonly<Record<AboutImageVariant, ImageSpec>> = {
  /*
   * THE HERO BACKDROP - a full-bleed page hero, the widest slot on the page.
   *
   * The website's <HeroSlider> renders each backdrop as one <img> at
   * `absolute inset-0 h-full w-full object-cover`, full-bleed under a navy
   * scrim, with the eyebrow, headline and description on top. About's call
   * gives it min-h-[520px] rising to min-h-[620px] from md up, so at a 1920px
   * viewport the band is roughly 1920x620 - about 3.1:1, far wider than any
   * photograph anybody uploads. object-cover is therefore always going to crop
   * vertically, and these numbers are chosen around that rather than against
   * it.
   *
   *   width 1600   The band is as wide as the viewport, so width is the only
   *                dimension that decides whether it looks sharp. 1600 is what
   *                the three Unsplash backdrops on the page already request
   *                (their URLs carry w=1600), the width the site's own
   *                full-bleed hero art ships at
   *                (public/images/home_hero_bg.webp, 1600x566), and the top
   *                stop in the website's srcSet ladder - nothing on the page
   *                ever asks for more.
   *
   *   height 800   Not the band's height, but the height that makes the
   *                RECOMMENDED crop 2:1, because in this spec the two numbers
   *                are the minimum size AND the target aspect ratio at once.
   *
   * Identical to the Partner Program hero's spec, and deliberately so: both are
   * the same kind of slot, and two page heroes that accepted different
   * photographs would be a trap rather than a rule. With the 0.25 tolerance the
   * Insider, Contact and Partner heroes use, a 2:1 target accepts everything
   * from 3:2 (1.50) through 16:9 (1.78) and 2:1 to cinemascope (2.35) - every
   * ordinary landscape photo - and refuses a square or portrait one, which in a
   * band this wide would be reduced to a thin horizontal slice and upscaled to
   * get there.
   */
  hero: { label: 'Hero backdrop', width: 1600, height: 800, ratioTolerance: 0.25 },

  /*
   * THE HERO BACKDROP ON A PHONE - the same band, portrait.
   *
   * Optional, and per backdrop: an entry may carry a phone crop beside its
   * desktop one, and with none published the desktop image serves every
   * viewport exactly as it does today. It exists because the band above the
   * `md` breakpoint and the band below it are not the same shape at all.
   * HeroSlider's min-h-[520px] and About's pt-32 make the phone band
   * 375x688 CSS px at a 375px viewport (measured on the running page) - 0.55:1,
   * PORTRAIT, against a desktop crop authored at 2:1 - so object-cover keeps a
   * narrow vertical sliver of the middle of that wide photograph and throws the
   * rest away. With a crop published the slider renders the backdrop through a
   * <picture> whose (max-width: 767px) <source> the browser resolves before any
   * of our code runs, so a phone never downloads the desktop file at all.
   *
   * THE HOME HERO'S MOBILE SPEC, REUSED UNCHANGED - 800x1200, 2:3, tolerance
   * 0.2 - exactly as the Insider hero reuses it, and for the same reason: this
   * is the same <HeroSlider> band with the same kind of min-height, so a crop
   * authored for one is a crop authored for the other, and three page heroes
   * that accepted three different portrait shapes would be a trap rather than a
   * rule. 800px wide covers a 400px phone at 2x, and 2:3 sits between the band's
   * own 0.55 and the 0.75 the Partner hero's shorter <PageHero> band asks for;
   * with the 0.2 tolerance it accepts 9:16 (0.5625 - a phone camera held
   * upright) through 4:5 (0.8), and refuses a landscape photograph, which here
   * would be reduced to a thin horizontal band and upscaled to get there.
   */
  heroMobile: HERO_IMAGE_SPECS.mobile,

  /*
   * THE FOUNDER PORTRAIT AND THE TEAM HEADSHOTS - square.
   *
   * Both render into a circle: the founder's into the 96px monogram disc on the
   * dark card (and, at the modal, a 64px rounded square), each team member's
   * into a 96px disc on the grid. A circle crops a rectangle to its shorter
   * side, so anything but a square loses the sides of the face - which is
   * exactly what the ratio check is for.
   *
   *   400x400      Four times the 96px disc, so a 2x phone screen still gets a
   *                full-density image with room for the 2x modal crop, and
   *                small enough that a headshot from a phone camera passes
   *                without being resized first.
   *
   *   tolerance    0.15, tighter than the hero's 0.25: a wide crop in a circle
   *                is a beheading, and there is no composition argument for
   *                allowing 4:3 into a slot that renders as a disc.
   */
  portrait: { label: 'Photo', width: 400, height: 400, ratioTolerance: 0.15 },

  /*
   * THE CLOSING CTA BANNER - a wide inset card.
   *
   * Unlike the hero, this one is NOT object-cover: the desktop block renders
   * the image at `block h-auto w-full` inside the page's Container, so the card
   * is exactly as tall as the picture's own ratio makes it, and the copy is
   * absolutely positioned over its right half. A different ratio does not crop
   * here - it changes the height of the band and moves the copy off the bright
   * part of the artwork it was written to sit on.
   *
   *   1600x600     The artwork the page ships is 2048x768 (the component
   *                declares those intrinsics), which is 8:3 - and 1600x600 is
   *                the same 8:3 at the width everything else on this page is
   *                measured in. Asking for the full 2048 would refuse an
   *                otherwise perfect banner for being narrower than a file
   *                nobody has to match; 1600 is still comfortably above the
   *                ~1280px the Container ever renders it at.
   *
   *   tolerance    0.15. Wide enough to accept 21:9 (2.33) and 5:2 (2.50)
   *                either side of 2.67, tight enough to refuse 16:9 (1.78) and
   *                anything squarer, which would make this band half the page
   *                tall with the copy floating in the middle of it.
   */
  cta: { label: 'Banner image', width: 1600, height: 600, ratioTolerance: 0.15 },

  /*
   * THE CLOSING CTA BANNER ON A NARROW SCREEN - portrait, and a different
   * picture entirely.
   *
   * Optional. With none published the section renders exactly as it does today:
   * the narrow layout keeps the house artwork it has always shipped
   * (public/images/about_us_cta_mobile.webp), and the wide one keeps the
   * published banner.
   *
   * IT IS NOT A SECOND SIZE OF THE WIDE BANNER, and unlike the hero pair it is
   * not even the same kind of fit. <AboutCtaSection> renders two separate blocks
   * and swaps them at Tailwind's `lg`:
   *
   *   >= 1024px  the wide artwork at `block h-auto w-full` - the card is as tall
   *              as the file's own ratio makes it (the shipped one is 2048x768,
   *              8:3 = 2.67) and the copy sits over its right half.
   *
   *   <= 1023px  a portrait scene at `absolute inset-0 h-full w-full object-cover
   *              object-top`, with the copy in normal flow under a `pt-[95%]`
   *              spacer - so the block is the scene plus however many lines of
   *              copy follow it, and the picture is cropped to fill that box.
   *
   * THE BREAKPOINT IS 1024, NOT THE 767 THE SLIDER HEROES USE and not the Partner
   * hero's 539. Those bands are one element whose aspect drifts with the
   * viewport, so their crossover had to be measured and argued. Here the two
   * blocks are separate DOM: the aspect does not drift and then flip, it flips
   * exactly where the blocks swap. Measured on the running page, the narrow block
   * is
   *
   *     375 -> 327x676  (0.48)      640 -> 592x859   (0.69)
   *     414 -> 366x713  (0.51)      768 -> 678x941   (0.72)
   *     480 -> 432x752  (0.57)     1023 -> 934x1154  (0.81)
   *
   * - portrait at every width it is used at - and at 1024 the other block takes
   * over at 2.67. So the site's <source> is media="(max-width: 1023.98px)" - every
   * width BELOW the `lg` breakpoint rather than every width up to a round 1023,
   * because a device pixel ratio that is not a whole number makes the viewport
   * fractional (1023.2 CSS px on a 1279px window at 125% scaling) and a round 1023
   * would hand those widths the wide banner - and this crop serves TABLETS as well
   * as phones. That is the fact the two numbers below are chosen around.
   *
   *   height 1680  Taken first here, because it is the number that sets the
   *                shape. Not the block's own height, but the height that makes
   *                the RECOMMENDED crop 1:2 (0.5), because in this spec the two
   *                numbers are the minimum size AND the target aspect ratio at
   *                once. 0.5 sits with the PHONE end of the table - between the
   *                house artwork's own 0.46 and the 0.48-0.51 the block measures
   *                at 375-414px - deliberately, and not at the 0.63 midpoint of
   *                the whole range, because the two ends fail differently. Too
   *                tall for the box costs the BOTTOM of the file, which
   *                `object-top` throws away by design - it is exactly what the
   *                house file does today, showing only its top ~57% at 1023px -
   *                while too wide costs the SIDES at 375px, where the scene is.
   *                Only one of those is worth refusing an upload over.
   *
   *   width 840    Deliberately UNDER the widest box this crop is ever painted
   *                into (934 CSS px, at the 1023px top of the range): 840 is 90%
   *                of it, so effectively 1x at the far tablet end and ~2.3x on the
   *                366px box a 414px phone gives it, which is where this crop is
   *                actually looked at. The tablet end is where object-top already
   *                throws the bottom of the file away by design, so it is the end
   *                that can afford to give.
   *
   *                IT IS 840 AND NOT 900 BECAUSE OF THE HOUSE FILE.
   *                public/images/about_us_cta_mobile.webp is 849x1852 - read off
   *                the WebP header rather than trusted from the filename - and it
   *                is the picture this block shows today and falls back to while
   *                the slot is empty. The admin who publishes a new wide banner
   *                and then wants the narrow layout to agree with it reaches for
   *                exactly that file, and a 900 floor refused it by 51px on one
   *                axis, reporting "at least 900x1800px; this one is 849x1852px" -
   *                a message whose second number is TALLER than its first, because
   *                checkImageDimensions tests size BEFORE ratio and so never gets
   *                as far as the shape, which was never the problem (0.4584
   *                against a 0.5 target is 8% of a 25% allowance). A slot built to
   *                supersede a picture has to be able to hold that picture.
   *
   *                Two things this number is NOT. It is not 2x the tablet box
   *                (1868), which is above the top stop in the website's srcSet
   *                ladder (lib/img.js, 1600) - nothing on this page requests that
   *                much. And it is not low enough to cost quality: the natural 1:2
   *                crop of a phone photograph - 1080x1920 trimmed to shape - is
   *                960x1920 and still clears it comfortably, which is the file an
   *                admin is most likely to arrive with after the house one.
   *
   * It is NOT the Partner hero's 900x1200, and never was kin to it - that band is
   * 0.75 to this one's 0.5, because there the copy sits BELOW the picture while
   * here it is layered over it behind a `pt-[95%]` spacer, which makes this block
   * half again as tall for its width.
   *
   * With tolerance 0.25 - the same allowance the two mobile hero crops use, and
   * wider than the 0.15 the desktop banner above needs because that slot sets the
   * card's height while this one is cropped to fit it - a 1:2 target accepts
   * everything from 3:8 (0.375) through 9:16 (0.5625 - a phone camera held
   * upright, uncropped) to 5:8 (0.625), and refuses 2:3 (0.667) and 3:4 (0.75),
   * which at 375px would lose a quarter or more of their width off the sides.
   * Note that the hero's own mobile crop, 800x1200, is refused here twice over:
   * 0.667 is outside the band, and 800 is under this slot's 840 - which
   * checkImageDimensions reports first.
   *
   * THE SIZE RULE NARROWS THAT BAND AT THE FLOOR, AND THE HINT HAS TO SAY SO.
   * The two rules are ANDed and the size one wants width >= 840 AND height >= 1680
   * independently, so a file authored at exactly the advertised minimum WIDTH has
   * nowhere to put the extra width a wider-than-1:2 shape needs: at 840 wide the
   * reachable band is 0.375-0.500 only, 9:16 needs at least 945px of width and 5:8
   * at least 1050. Taller-than-1:2 crops are unaffected - they gain height, which
   * the floor already allows. Worth stating in the admin hint rather than only
   * here, because the refusal an admin meets for a 9:16 crop at 840x1493 talks
   * about size and never mentions shape.
   */
  ctaMobile: { label: 'Mobile banner image', width: 840, height: 1680, ratioTolerance: 0.25 },
} as const;
