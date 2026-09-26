// src/modules/vs-sap-page/validators/comparison-section.validator.ts

import { validator, Validator } from '../../../core/utils/validation';
import { ReplaceVsSapComparisonSectionInput } from '../types/comparison.types';
import { EYEBROW_MAX, EYEBROW_MIN, HEADING_MAX, HEADING_MIN } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones 053_vs_sap_page.sql
 * sizes its columns to. Changing one means changing all three.
 *
 * The subtext is one sentence under the headline, the Blog topics intro's cap.
 * A TCO label is a short verdict printed in capitals inside a narrow table
 * cell ('VERY HIGH'), not a sentence.
 */
const SUBTEXT_MIN = 3;
const SUBTEXT_MAX = 300;
const TCO_LABEL_MIN = 1;
const TCO_LABEL_MAX = 40;

/**
 * The table's headline is drawn as it is written: its heading component has no
 * accent span. A `**` would ship to the live site as two literal asterisks, so
 * it is refused here rather than saved.
 */
function validatePlainHeading(v: Validator, field: string, value: string): void {
  v.custom(
    !value.includes('**'),
    field,
    `${field} does not support ** accent markers; this headline is shown as plain text`,
    'UNSUPPORTED_MARKUP',
  );
}

/**
 * PUT is a full replace of the table's copy and its TCO row. The capability
 * rows are their own resource with their own routes: a save of this form must
 * not be able to reorder or delete a row, and adding a row must not have to
 * resend the headline.
 */
export function validateReplaceVsSapComparisonSection(
  body: unknown,
): ReplaceVsSapComparisonSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: HEADING_MIN, max: HEADING_MAX });
  if (heading) validatePlainHeading(v, 'heading', heading);

  const dto: ReplaceVsSapComparisonSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: EYEBROW_MIN, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: SUBTEXT_MIN, max: SUBTEXT_MAX }),
    tcoUpwon: v.requiredString('tcoUpwon', { min: TCO_LABEL_MIN, max: TCO_LABEL_MAX }),
    tcoSap: v.requiredString('tcoSap', { min: TCO_LABEL_MIN, max: TCO_LABEL_MAX }),
    tcoNetsuite: v.requiredString('tcoNetsuite', { min: TCO_LABEL_MIN, max: TCO_LABEL_MAX }),
  };

  v.assert();
  return dto;
}
