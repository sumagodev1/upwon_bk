// src/modules/blog/validators/hero-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceBlogHeroSectionInput } from '../types/hero-section.types';
import {
  CTA_LABEL_MAX,
  CTA_LABEL_MIN,
  EYEBROW_MAX,
  EYEBROW_MIN,
  HEADING_MAX,
  HEADING_MIN,
  SUBTEXT_MAX,
  SUBTEXT_MIN,
} from './shared';

/**
 * PUT is a full replace of the singleton, and every field is required: the
 * hero has always carried an eyebrow, a headline, a subtext and BOTH button
 * labels, and the slider lays the buttons out as a pair - a hero with one of
 * them missing is a layout the page has never had.
 *
 * Only the labels are authored: where the buttons go is fixed in the site's
 * code, so a link sent here is not a field of this section and is ignored,
 * like any other unknown key.
 *
 * The headline is plain text. HeroSlider draws it as written, so there is no
 * accent markup to check here, unlike the topics intro below it.
 */
export function validateReplaceBlogHeroSection(body: unknown): ReplaceBlogHeroSectionInput {
  const v = validator(body);

  const dto: ReplaceBlogHeroSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: EYEBROW_MIN, max: EYEBROW_MAX }),
    heading: v.requiredString('heading', { min: HEADING_MIN, max: HEADING_MAX }),
    subtext: v.requiredString('subtext', { min: SUBTEXT_MIN, max: SUBTEXT_MAX }),
    primaryCtaLabel: v.requiredString('primaryCtaLabel', {
      min: CTA_LABEL_MIN,
      max: CTA_LABEL_MAX,
    }),
    secondaryCtaLabel: v.requiredString('secondaryCtaLabel', {
      min: CTA_LABEL_MIN,
      max: CTA_LABEL_MAX,
    }),
  };

  v.assert();
  return dto;
}
