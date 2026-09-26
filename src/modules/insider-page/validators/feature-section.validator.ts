// src/modules/insider-page/validators/feature-section.validator.ts

import { CONTENT_STATUSES } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import { hasBalancedAccentMarkers } from '../../home-page/utils/heading-markup';
import { ReplaceInsiderFeatureSectionInput } from '../types/feature-section.types';

/** Authoring limits, matched against the trimmed text. */
const BADGE_MAX = 40;
const EYEBROW_MAX = 80;
const HEADING_MAX = 300;
const BODY_MAX = 2000;
const BULLETS_MAX = 8;
const BULLET_MAX = 200;
const URL_MAX = 1000;

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
export function validateReplaceInsiderFeatureSection(
  body: unknown,
): ReplaceInsiderFeatureSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeading(v, 'heading', heading);

  const imageUrl = v.nullableString('imageUrl', { max: URL_MAX }) ?? null;
  if (imageUrl) validateContentUrl(v, 'imageUrl', imageUrl, 'INVALID_IMAGE_URL');

  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors insider_feature_section_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: ReplaceInsiderFeatureSectionInput = {
    badge: v.nullableString('badge', { max: BADGE_MAX }) ?? null,
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    body: v.requiredString('body', { min: 3, max: BODY_MAX }),
    bullets: v.textList('bullets', { max: BULLETS_MAX, maxLength: BULLET_MAX }),
    imageUrl,
    imageFileId,
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}
