// src/modules/about-page/validators/founder-note.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceAboutFounderNoteInput } from '../types/founder-note.types';
import { readImagePair } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin panel's counters are written against and the ones
 * 024_about_page_founder_note.sql sizes its columns to. Changing one means
 * changing all three.
 */
const NAME_MIN = 2;
const NAME_MAX = 120;
const ROLE_MIN = 2;
const ROLE_MAX = 120;
const COMPANY_LINE_MIN = 2;
const COMPANY_LINE_MAX = 160;
/** A pull-quote set at display size. Past this it stops being a pull-quote. */
const QUOTE_MIN = 10;
const QUOTE_MAX = 400;
/** The paragraph under it - one paragraph, not an essay. */
const BODY_MIN = 20;
const BODY_MAX = 900;

/**
 * PUT is a full replace of the singleton: every field is read, and an absent
 * nullable field is stored as null.
 *
 * No heading markup check anywhere here, unlike the other four sections: this
 * band has no headline. The quote and the paragraph are prose the site renders
 * as text, and a '**' in either is two asterisks rather than an accent.
 */
export function validateReplaceAboutFounderNote(body: unknown): ReplaceAboutFounderNoteInput {
  const v = validator(body);

  const photo = readImagePair(v, 'photoUrl', 'photoFileId');

  const dto: ReplaceAboutFounderNoteInput = {
    founderName: v.requiredString('founderName', { min: NAME_MIN, max: NAME_MAX }),
    founderRole: v.requiredString('founderRole', { min: ROLE_MIN, max: ROLE_MAX }),
    companyLine: v.requiredString('companyLine', {
      min: COMPANY_LINE_MIN,
      max: COMPANY_LINE_MAX,
    }),
    quote: v.requiredString('quote', { min: QUOTE_MIN, max: QUOTE_MAX }),
    body: v.requiredString('body', { min: BODY_MIN, max: BODY_MAX }),
    photoUrl: photo.url,
    photoFileId: photo.fileId,
  };

  v.assert();
  return dto;
}
