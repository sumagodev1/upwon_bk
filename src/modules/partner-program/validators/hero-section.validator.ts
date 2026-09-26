// src/modules/partner-program/validators/hero-section.validator.ts

import { validator, Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../../home-page/utils/heading-markup';
import { readImagePair } from '../../home-page/utils/image-pair';
import { ReplacePartnerProgramHeroSectionInput } from '../types/hero-section.types';

/**
 * Authoring limits, matched against the trimmed text. The same numbers the
 * Contact hero uses, plus the home hero's eyebrow width - this hero renders
 * through the same <PageHero> pill - and they are the numbers the admin panel's
 * counters and the website's own client-side checks are written against.
 * Changing one means changing all three, and 021_partner_program_hero.sql sizes
 * eyebrow and image_url to match.
 *
 * The image URL cap is not one of them: both slots are read by
 * home-page/utils/image-pair's readImagePair, which owns it.
 */
const EYEBROW_MAX = 120;
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;

/** The same check, and the same message, as the home hero heading. */
function validateHeading(v: Validator, field: string, value: string): void {
  v.custom(
    hasBalancedAccentMarkers(value),
    field,
    `${field} has an unclosed ** accent marker; wrap accented words as **like this**`,
    'UNBALANCED_ACCENT_MARKER',
  );
}

/**
 * PUT is a full replace of the singleton: every field is read, and an absent
 * nullable field is stored as null. There is no merge, because the admin form
 * always sends the whole section and a merge would let a stale field survive a
 * save that meant to clear it.
 */
export function validateReplacePartnerProgramHeroSection(
  body: unknown,
): ReplacePartnerProgramHeroSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeading(v, 'heading', heading);

  /*
   * Two image slots - the desktop backdrop and the narrow-viewport crop - each
   * read as its own pair by the same shared helper, so both behave identically
   * and an admin who makes the same mistake in either slot is told the same thing
   * about the field they are actually looking at.
   *
   * Every one of the four is optional. With NEITHER crop the hero renders on the
   * ambient background it has today, which is how it is seeded; with a desktop
   * image and no mobile crop the site's <picture> falls back to the desktop
   * source, which is exactly what it rendered before the mobile pair existed.
   * Publishing this section still changes nothing until somebody uploads a
   * photograph.
   *
   * A mobile crop with no desktop image is allowed here for the same reason the
   * Contact hero allows it: the two slots are independent, and refusing the save
   * would mean an admin cannot upload the phone crop first. Whichever ONE crop is
   * published then serves every viewport - PartnersPage reads the backdrop as
   * `image || mobileImage`, exactly as ContactHeroSection does, because mixing in
   * an unrelated house photograph would put two different pictures on what is one
   * page to a visitor who rotates their phone. So the phone crop on its own is a
   * legal (if odd) state that shows that photograph on a laptop too, not a hero
   * with no backdrop above the breakpoint. The admin form says so at the slot.
   *
   * The About hero is the one that differs: its backdrops are a LIST, an entry
   * exists only because of its photograph, and its public read drops an entry with
   * no desktop image - so there a phone crop with no desktop image is refused.
   */
  const desktop = readImagePair(v, 'imageUrl', 'imageFileId');
  const mobile = readImagePair(v, 'mobileImageUrl', 'mobileImageFileId');

  const dto: ReplacePartnerProgramHeroSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl: desktop.url,
    imageFileId: desktop.fileId,
    mobileImageUrl: mobile.url,
    mobileImageFileId: mobile.fileId,
  };

  v.assert();
  return dto;
}
