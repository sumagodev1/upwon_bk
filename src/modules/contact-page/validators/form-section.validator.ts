// src/modules/contact-page/validators/form-section.validator.ts

import { LIMITS } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import { ReplaceContactFormSectionInput } from '../types/form-section.types';
import { HEADING_MAX, requiredTextList, validateHeadingMarkup } from './shared';

/** Authoring limits, matched against the trimmed text. */
const EYEBROW_MAX = 80;
const FOOTNOTE_MAX = 200;
const SUCCESS_HEADING_MAX = 120;
const SUCCESS_BODY_MAX = 600;
/** One choice is a chip or a button face, not a sentence. */
const CHOICE_MAX = 60;

/** A full replace of the copy and choices around the enquiry form. */
export function validateReplaceContactFormSection(
  body: unknown,
): ReplaceContactFormSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeadingMarkup(v, 'heading', heading);

  const dto: ReplaceContactFormSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    // Each list needs at least one entry: an empty one renders as a labelled
    // blank space, and the form's own state has nothing to preselect.
    businessTypes: requiredTextList(v, 'businessTypes', 'business type', {
      max: LIMITS.MAX_CONTACT_BUSINESS_TYPES,
      maxLength: CHOICE_MAX,
    }),
    revenueRanges: requiredTextList(v, 'revenueRanges', 'revenue range', {
      max: LIMITS.MAX_CONTACT_REVENUE_RANGES,
      maxLength: CHOICE_MAX,
    }),
    platforms: requiredTextList(v, 'platforms', 'platform', {
      max: LIMITS.MAX_CONTACT_PLATFORMS,
      maxLength: CHOICE_MAX,
    }),
    footnote: v.requiredString('footnote', { min: 3, max: FOOTNOTE_MAX }),
    successHeading: v.requiredString('successHeading', { min: 3, max: SUCCESS_HEADING_MAX }),
    successBody: v.requiredString('successBody', { min: 3, max: SUCCESS_BODY_MAX }),
  };

  v.assert();
  return dto;
}
