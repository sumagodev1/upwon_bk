// src/core/utils/visitor-phone.ts

import { Validator } from './validation';

/**
 * The phone rule for numbers a VISITOR types into a form on the marketing
 * site, as opposed to ones an administrator types into the panel.
 *
 * It lived inside the Contact enquiry validator until the Careers application
 * form needed the same rule. Two copies of a regular expression this
 * deliberately loose would have drifted the first time one of them was
 * loosened further, and the two forms would then have refused different
 * numbers for no reason a visitor could see - so it lives here, once, and both
 * validators call it.
 *
 * Deliberately looser than Validator.optionalPhone. That one guards numbers an
 * admin types into the panel. This one guards what a stranger types into a
 * marketing form, where '+91 93568 98277', '(020) 4567-8900' and
 * '+1 555 010 0000 ext. 12' are all the same intent, and a rejection costs a
 * lead or a candidate rather than catching a mistake. So: an optional leading
 * bracket and +, then digits and the separators people actually use, with the
 * digit count checked separately - that is the part that carries meaning.
 *
 * The leading `\(?` is not decoration. Without it this pattern refused
 * '(020) 4567-8900' - the very example above - and '(+91) 93568 98277',
 * because it demanded a digit in first position and an area code in brackets
 * puts a parenthesis there. Writing the area code that way is ordinary, so
 * that was a lead lost to a typo nobody made.
 *
 * It stays strict about what it does NOT open with: '-9356898277', '+++' and
 * 'call me maybe' are all still refused, and '(020' is refused by the digit
 * count rather than by the shape.
 */
const PHONE_SHAPE = /^\(?\+?[0-9][0-9\s\-().+/]*$/;
const PHONE_MIN_DIGITS = 7;
/** E.164's ceiling; anything longer is not a dialable number. */
const PHONE_MAX_DIGITS = 18;

/**
 * The column width both public forms store a phone number in.
 *
 * Wider than the 30 Validator.optionalPhone allows, because a number written
 * with a country code, brackets and an extension runs past 30 characters
 * without being wrong. Matches contact_enquiries.phone and
 * career_applications.phone.
 */
export const VISITOR_PHONE_MAX = 40;

const digitsIn = (value: string): number => value.replace(/[^0-9]/g, '').length;

/**
 * Checks an already-read, already-trimmed phone string and records a field
 * error on `v` if it is not one.
 *
 * Takes the value rather than reading it, because the two callers differ in
 * whether the field is required: the enquiry form's is optional and skips this
 * entirely when blank, the application form's is required and has already
 * failed by the time this would run.
 */
export function validateVisitorPhone(v: Validator, field: string, value: string): void {
  v.custom(
    PHONE_SHAPE.test(value) &&
      digitsIn(value) >= PHONE_MIN_DIGITS &&
      digitsIn(value) <= PHONE_MAX_DIGITS,
    field,
    `${field} must be a phone number, digits optionally with + ( ) - . and spaces`,
    'INVALID_PHONE',
  );
}
