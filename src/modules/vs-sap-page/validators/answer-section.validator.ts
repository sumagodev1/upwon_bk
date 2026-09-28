// src/modules/vs-sap-page/validators/answer-section.validator.ts

import { LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers, parseHeading } from '../../home-page/utils/heading-markup';
import { ReplaceVsSapAnswerSectionInput } from '../types/answer-section.types';
import { EYEBROW_MAX, EYEBROW_MIN, HEADING_MAX, HEADING_MIN } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones 053_vs_sap_page.sql
 * sizes its columns to. Changing one means changing all three.
 *
 * A card title is one small-caps line; a point is one sentence beside a tick,
 * and the longest the site ships is under eighty characters.
 */
const TITLE_MIN = 2;
const TITLE_MAX = 120;
const POINT_MAX = 240;
const CLOSING_LINE_MIN = 3;
const CLOSING_LINE_MAX = 240;

/**
 * C0 control characters, less tab, newline and carriage return - the set
 * Validator.requiredString refuses. textList does not check them, and a NUL
 * cannot be stored in a jsonb string at all, so a point carrying one would pass
 * every other check here and then fail the write as a 500 naming no field.
 */
const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

/**
 * The same markup check, and the same message, as the home hero heading - plus
 * the Blog topics intro's one extra rule: at most ONE accent span. The site
 * renders this headline as "plain words, then the orange phrase"; a second
 * accent would be drawn, but it is not a layout the section has ever had, and
 * the admin panel's hint is written against one.
 */
function validateAccentHeading(v: Validator, field: string, value: string): void {
  if (!value) return;

  const balanced = hasBalancedAccentMarkers(value);
  v.custom(
    balanced,
    field,
    `${field} has an unclosed ** accent marker; wrap accented words as **like this**`,
    'UNBALANCED_ACCENT_MARKER',
  );
  if (!balanced) return;

  const accents = parseHeading(value)
    .flat()
    .filter((part) => part.accent).length;
  v.custom(
    accents <= 1,
    field,
    `${field} may contain at most one **accent** span`,
    'TOO_MANY_ACCENTS',
  );
}

/**
 * One card's points, required to hold at least one entry.
 *
 * textList already trims entries and drops blank ones, so the empty row a list
 * editor leaves behind never saves - which is also why the minimum is checked
 * after it rather than on the raw array. Order and duplicates are kept: in copy
 * both carry meaning.
 */
function readPoints(v: Validator, field: string): string[] {
  const points = v.textList(field, {
    max: LIMITS.MAX_VS_SAP_ANSWER_POINTS,
    maxLength: POINT_MAX,
  });
  v.custom(points.length > 0, field, 'Add at least one point', 'REQUIRED');
  v.custom(
    !points.some((point) => CONTROL_CHARACTERS.test(point)),
    field,
    `${field} contains characters that are not allowed`,
    'INVALID_CHARACTERS',
  );
  return points;
}

/** PUT is a full replace of the section: the headline, both cards and the closing line. */
export function validateReplaceVsSapAnswerSection(
  body: unknown,
): ReplaceVsSapAnswerSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: HEADING_MIN, max: HEADING_MAX });
  validateAccentHeading(v, 'heading', heading);

  const dto: ReplaceVsSapAnswerSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: EYEBROW_MIN, max: EYEBROW_MAX }),
    heading,
    upwonTitle: v.requiredString('upwonTitle', { min: TITLE_MIN, max: TITLE_MAX }),
    upwonPoints: readPoints(v, 'upwonPoints'),
    sapTitle: v.requiredString('sapTitle', { min: TITLE_MIN, max: TITLE_MAX }),
    sapPoints: readPoints(v, 'sapPoints'),
    closingLine: v.requiredString('closingLine', {
      min: CLOSING_LINE_MIN,
      max: CLOSING_LINE_MAX,
    }),
  };

  v.assert();
  return dto;
}
