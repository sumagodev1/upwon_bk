// src/modules/contact-page/validators/contact-details.validator.ts

import { LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  ContactOffice,
  ReplaceContactDetailsSectionInput,
} from '../types/contact-details.types';

/** Authoring limits, matched against the trimmed text. */
const TITLE_MAX = 80;
const OFFICE_NAME_MAX = 120;
const OFFICE_DETAIL_MAX = 200;
const PHONE_MAX = 30;

/**
 * A dialable number as a human writes it: an optional leading +, then digits
 * with spaces, dashes, dots or brackets between them. Deliberately looser than
 * E.164 because these strings are displayed as well as linked - '+91 93568
 * 98277' is what belongs on the card.
 */
const PHONE_SHAPE = /^\+?[0-9][0-9\s\-().]*$/;

/** E.164 allows 15 digits; below 8 it cannot be a reachable number. */
const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 15;

const digitsOf = (value: string): string => value.replace(/\D/g, '');

/**
 * Checks a number the site turns into a `tel:` or `wa.me` link. Both strip
 * non-digits at the point of use, so what has to hold is that enough digits
 * survive that stripping - a check on the punctuation alone would pass
 * '+(-) -' and ship a dead link.
 */
function validatePhoneLike(v: Validator, field: string, value: string, label: string): void {
  if (!value) return;

  if (!PHONE_SHAPE.test(value)) {
    v.custom(
      false,
      field,
      `${label} must be digits, optionally starting with + and separated by spaces, dashes or brackets`,
      'INVALID_PHONE',
    );
    return;
  }

  const digits = digitsOf(value).length;
  v.custom(
    digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS,
    field,
    `${label} must contain between ${MIN_PHONE_DIGITS} and ${MAX_PHONE_DIGITS} digits`,
    'INVALID_PHONE',
  );
}

/**
 * The "Where we are" entries, in order.
 *
 * Read off the raw body rather than through a Validator helper because there
 * is none for an array of objects, and the per-entry errors have to name the
 * row that is wrong ('offices[1].detail') or the admin form cannot put the
 * message under the right input.
 *
 * A row where both fields are blank is dropped rather than rejected: that is
 * the empty row an editor leaves behind, and the feature section's bullets
 * treat it the same way. A row with one of the two filled in is a half-typed
 * entry, and is reported.
 */
function parseOffices(v: Validator, body: unknown): ContactOffice[] {
  const raw = (body as { offices?: unknown } | null)?.offices;

  if (raw === undefined || raw === null) {
    v.custom(false, 'offices', 'Add at least one office', 'REQUIRED');
    return [];
  }
  if (!Array.isArray(raw)) {
    v.custom(false, 'offices', 'offices must be an array', 'INVALID_TYPE');
    return [];
  }
  if (raw.length > LIMITS.MAX_CONTACT_OFFICES) {
    v.custom(
      false,
      'offices',
      `offices may contain at most ${LIMITS.MAX_CONTACT_OFFICES} entries`,
      'TOO_MANY',
    );
    return [];
  }

  const offices: ContactOffice[] = [];

  raw.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      v.custom(false, `offices[${index}]`, 'Each office must be an object', 'INVALID_TYPE');
      return;
    }

    const { name, detail } = entry as { name?: unknown; detail?: unknown };
    const nameText = typeof name === 'string' ? name.trim() : '';
    const detailText = typeof detail === 'string' ? detail.trim() : '';

    // The trailing empty row an editor leaves behind.
    if (nameText === '' && detailText === '') return;

    if (nameText === '') {
      v.custom(false, `offices[${index}].name`, 'Office name is required', 'REQUIRED');
    } else if (nameText.length > OFFICE_NAME_MAX) {
      v.custom(
        false,
        `offices[${index}].name`,
        `Office name must be at most ${OFFICE_NAME_MAX} characters`,
        'TOO_LONG',
      );
    }

    if (detailText === '') {
      v.custom(false, `offices[${index}].detail`, 'Office detail is required', 'REQUIRED');
    } else if (detailText.length > OFFICE_DETAIL_MAX) {
      v.custom(
        false,
        `offices[${index}].detail`,
        `Office detail must be at most ${OFFICE_DETAIL_MAX} characters`,
        'TOO_LONG',
      );
    }

    offices.push({ name: nameText, detail: detailText });
  });

  v.custom(offices.length > 0, 'offices', 'Add at least one office', 'REQUIRED');

  return offices;
}

/** A full replace of both side cards. */
export function validateReplaceContactDetailsSection(
  body: unknown,
): ReplaceContactDetailsSectionInput {
  const v = validator(body);

  const phone = v.requiredString('phone', { min: 5, max: PHONE_MAX });
  validatePhoneLike(v, 'phone', phone, 'phone');

  const whatsapp = v.requiredString('whatsapp', { min: 5, max: PHONE_MAX });
  validatePhoneLike(v, 'whatsapp', whatsapp, 'whatsapp');

  const dto: ReplaceContactDetailsSectionInput = {
    officesTitle: v.requiredString('officesTitle', { min: 2, max: TITLE_MAX }),
    offices: parseOffices(v, body),
    directTitle: v.requiredString('directTitle', { min: 2, max: TITLE_MAX }),
    email: v.requiredEmail('email'),
    phone,
    whatsapp,
  };

  v.assert();
  return dto;
}
