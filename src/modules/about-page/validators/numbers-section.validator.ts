// src/modules/about-page/validators/numbers-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceAboutNumbersSectionInput } from '../types/numbers.types';
import { EYEBROW_MAX, HEADING_MAX, SUBTEXT_MAX, validateHeadingMarkup } from './shared';

/**
 * PUT is a full replace of the section's copy. The stat cards under it are their
 * own resource with their own routes - see the team section validator for why.
 */
export function validateReplaceAboutNumbersSection(
  body: unknown,
): ReplaceAboutNumbersSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeadingMarkup(v, 'heading', heading);

  const dto: ReplaceAboutNumbersSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
  };

  v.assert();
  return dto;
}
