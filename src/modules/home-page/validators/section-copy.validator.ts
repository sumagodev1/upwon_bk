// src/modules/home-page/validators/section-copy.validator.ts

import { PAGE_SECTION_KEYS, PageKey, SectionKey, isSectionOfPage } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import { ValidationError } from '../../../core/errors/ValidationError';
import { hasBalancedAccentMarkers } from '../utils/heading-markup';
import { UpsertSectionCopyInput } from '../types/section-copy.types';

/** Matched against the source text, so the limits are authoring limits. */
const EYEBROW_MAX = 120;
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;

/**
 * Checks a page/section pair against the known sections.
 *
 * A 422 rather than a 404: the keys are something the caller sent, and naming
 * the valid ones is more useful than "not found" for a fixed, short list. The
 * pair is checked together, not each half separately, so asking for the home
 * page's 'recognition' is rejected even though both keys exist on their own.
 */
export function validateSectionKeyParams(
  rawPage: string | undefined,
  rawSection: string | undefined,
): { pageKey: PageKey; sectionKey: SectionKey } {
  if (rawPage && rawSection && isSectionOfPage(rawPage, rawSection)) {
    return { pageKey: rawPage as PageKey, sectionKey: rawSection as SectionKey };
  }

  const known = Object.entries(PAGE_SECTION_KEYS)
    .map(([page, sections]) => `${page}: ${sections.join(', ')}`)
    .join(' | ');

  throw new ValidationError('Unknown page section', [
    {
      field: 'sectionKey',
      message: `No such section. Known sections are - ${known}`,
      code: 'UNKNOWN_SECTION',
    },
  ]);
}

export function validateUpsertSectionCopy(body: unknown): UpsertSectionCopyInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) {
    v.custom(
      hasBalancedAccentMarkers(heading),
      'heading',
      'heading has an unclosed ** accent marker; wrap accented words as **like this**',
      'UNBALANCED_ACCENT_MARKER',
    );
  }

  const dto: UpsertSectionCopyInput = {
    // Optional: a section may open straight on its heading.
    eyebrow: v.optionalString('eyebrow', { min: 2, max: EYEBROW_MAX }) ?? null,
    heading,
    // Optional for the same reason the eyebrow is: some sections carry no
    // explanatory line, and inventing one would put a paragraph into a design
    // that deliberately has none.
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }) ?? null,
  };

  v.assert();
  return dto;
}
