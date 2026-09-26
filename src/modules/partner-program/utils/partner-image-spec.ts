// src/modules/partner-program/utils/partner-image-spec.ts

import { ImageSpec } from '../../home-page/utils/image-spec';

/**
 * What the Partner Program hero's two backdrop crops have to be. Checked by the
 * same checkImageDimensions as the home hero and the Contact hero, so the rules
 * and the error wording are identical - only the numbers differ.
 *
 * THE DESKTOP CROP.
 *
 * This slot is not a photograph beside the copy, the way the Contact hero's
 * 1672x940 crop is. It is the website's shared <PageHero> bgImages backdrop:
 * one <img> at `absolute inset-0 h-full w-full object-cover` with sizes="100vw",
 * full-bleed under a navy scrim, with the eyebrow, headline and description on
 * top of it. Measured on the running page, that band is 1910x535 CSS px at a
 * 1920px viewport - roughly 3.6:1, far wider than any photograph anybody
 * uploads - so object-cover is always going to crop the image vertically, and
 * these numbers are chosen around that rather than against it.
 *
 *   width 1600   The band is as wide as the viewport, so width is the only
 *                dimension that decides whether it looks sharp. 1600 is the
 *                width the site's own full-bleed hero art already ships at
 *                (public/images/home_hero_bg.webp, 1600x566) and the top stop
 *                in the website's srcSet ladder (lib/img.js DEFAULT_WIDTHS), so
 *                nothing on the page ever requests more than this.
 *
 *   height 800   Not the band's height - 535 - but the height that makes the
 *                RECOMMENDED crop 2:1, because in this spec the two numbers are
 *                the minimum size AND the target aspect ratio at once.
 *
 * With the 0.25 tolerance the Insider and Contact heroes use, a 2:1 target
 * accepts everything from 3:2 (1.50) through 16:9 (1.78) and 2:1 to
 * cinemascope (2.35) - i.e. every ordinary landscape photo an admin is likely
 * to have - and refuses a square or portrait one, which in a band this wide
 * would be reduced to a thin horizontal slice and upscaled to get there. That
 * is exactly the failure the ratio check exists to catch; a few percent of
 * drift is not.
 *
 * THE MOBILE CROP - portrait, and a different picture entirely.
 *
 * The same band one breakpoint down, and the reason the pair exists: PageHero
 * has no min-height, so on a phone the band is only as tall as the copy makes
 * it. Measured on the running page it is 375x525 CSS px at a 375px viewport -
 * 0.71:1, PORTRAIT - where the desktop crop above is 2:1 landscape. Serving the
 * desktop file there hands object-cover a picture nearly three times too wide
 * for the box, so it keeps a narrow vertical sliver of the middle and throws the
 * rest away. Hence a second crop, sized for that box:
 *
 *   width 900    Covers a 450px phone - wider than the widest common one - at 2x.
 *                The mobile <source> serves everything up to 539px (see below),
 *                so this is the entire width budget for that side of it. Asking
 *                for the desktop slot's 1600 would refuse perfectly good portrait
 *                photographs for being the shape phones actually shoot.
 *
 *   height 1200  Not the band's height, but the height that makes the
 *                RECOMMENDED crop 3:4 (0.75), because in this spec the two
 *                numbers are the minimum size AND the target ratio at once. 0.75
 *                is the middle of what the band does across the widths this crop
 *                is actually served at: 0.71 at 375px, 1.07 at 480px as the copy
 *                reflows to fewer lines.
 *
 * With the 0.25 tolerance the desktop slot uses, a 3:4 target accepts everything
 * from 9:16 (0.5625 - a phone camera held upright) through 2:3 (0.667 - the home
 * hero's mobile crop) and 3:4 to 15:16 (0.9375), and refuses a landscape
 * photograph, which in this box would be reduced to a thin horizontal band and
 * upscaled to get there. That is the failure the ratio check exists to catch.
 *
 * WHERE THE CROP STOPS BEING SERVED - 539px, NOT the 767px the slider heroes use.
 * Because this band has no min-height its SHAPE changes across that range, and
 * measured on the running page it stops being portrait almost at once: 375 ->
 * 0.71, 480 -> 1.07, 540 -> 1.20, 767 -> 1.98. At 767 the band is
 * indistinguishable from the desktop slot's own 2:1 target, so handing it the
 * portrait file would show about a third of that file's height while the
 * correctly-shaped desktop file was never downloaded - the browser resolves
 * <source> before any of our code runs. The crossover is the geometric mean of the
 * two crops' ratios (sqrt(0.75 * 2.0) = 1.22), which the band reaches at ~540px,
 * so PageHero's <source> is media="(max-width: 539px)" and above it the desktop
 * file serves the band it was authored for.
 *
 * Deliberately NOT the home hero's 800x1200 that the Insider hero reuses: those
 * are <HeroSlider> bands with a min-height and stay markedly taller than this
 * one at the same width - the About hero's phone band is 375x688 against this
 * 525 - so a crop authored for them is taller than this band needs. And note that
 * 800x1200 is REFUSED here, not merely discouraged, and not for its shape:
 * checkImageDimensions tests the minimum size BEFORE the ratio, and 800 is under
 * this slot's 900.
 *
 * Both crops are optional. A hero with a desktop image and no mobile one renders
 * exactly as it does today: the site's <picture> falls back to the desktop source.
 * A hero with ONLY the phone crop shows that photograph at every width, because
 * PartnersPage reads the backdrop as `image || mobileImage` the way the Contact
 * hero does - one published crop is never traded for an unrelated one.
 *
 * The hero is the page's only authored image: the three partnership models, the
 * economics block and the FAQ are static in the website's own code and have no
 * admin slot to check.
 *
 * The admin panel mirrors these numbers for its client-side hints.
 */

export type PartnerImageVariant = 'hero' | 'heroMobile';

export const PARTNER_IMAGE_SPECS: Readonly<Record<PartnerImageVariant, ImageSpec>> = {
  hero: { label: 'Hero image', width: 1600, height: 800, ratioTolerance: 0.25 },
  heroMobile: { label: 'Mobile image', width: 900, height: 1200, ratioTolerance: 0.25 },
} as const;
