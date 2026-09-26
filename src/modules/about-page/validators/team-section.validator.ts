// src/modules/about-page/validators/team-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceAboutTeamSectionInput } from '../types/team.types';
import {
  EYEBROW_MAX,
  HEADING_MAX,
  SUBTEXT_MAX,
  validateHeadingMarkup,
} from './shared';

/**
 * PUT is a full replace of the section's copy. The people under it are their own
 * resource with their own routes: a save of this form must not be able to
 * reorder or delete anybody, and an add must not have to resend the headline.
 */
export function validateReplaceAboutTeamSection(
  body: unknown,
): ReplaceAboutTeamSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeadingMarkup(v, 'heading', heading);

  const dto: ReplaceAboutTeamSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
  };

  v.assert();
  return dto;
}
