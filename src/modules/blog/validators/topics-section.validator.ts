// src/modules/blog/validators/topics-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceBlogTopicsSectionInput } from '../types/topics-section.types';
import {
  EYEBROW_MAX,
  EYEBROW_MIN,
  HEADING_MAX,
  HEADING_MIN,
  SUBTEXT_MAX,
  SUBTEXT_MIN,
  validateAccentHeading,
} from './shared';

/**
 * PUT is a full replace of the intro's copy. The categories under it are their
 * own resource with their own routes: a save of this form must not be able to
 * reorder or delete a chip, and adding a chip must not have to resend the
 * headline.
 */
export function validateReplaceBlogTopicsSection(body: unknown): ReplaceBlogTopicsSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: HEADING_MIN, max: HEADING_MAX });
  validateAccentHeading(v, 'heading', heading);

  const dto: ReplaceBlogTopicsSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: EYEBROW_MIN, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: SUBTEXT_MIN, max: SUBTEXT_MAX }),
  };

  v.assert();
  return dto;
}
