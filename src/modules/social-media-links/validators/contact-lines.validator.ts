// src/modules/social-media-links/validators/contact-lines.validator.ts

import {
  CONTENT_STATUSES,
  LIMITS,
  SOCIAL_CONTACT_LINE_KINDS,
  SocialContactLineKind,
} from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  CreateSocialContactLineInput,
  ReorderSocialContactLinesInput,
  SocialContactLineFilters,
  UpdateSocialContactLineInput,
} from '../types/contact-lines.types';
import { isAbsoluteHttpUrl, readSocialMediaIcon } from './shared';

/**
 * Authoring limits per kind, matched against the trimmed text. These are the
 * numbers the admin form's counters are written against, and 254 - the longest
 * of the four, an email address's own ceiling - is the one
 * 048_social_media_links.sql sizes the value column to. Changing one means
 * changing all three.
 */
const ADDRESS_MIN = 2;
const ADDRESS_MAX = 160;
// No EMAIL_MAX: an email is read by requiredEmail, which caps it at 254 itself.
const PHONE_MAX = 30;
const WEBSITE_MAX = 200;
/** The column. Only used before the kind is known - see readValueLoosely. */
const VALUE_MAX = 254;

/**
 * A dialable number as a human writes it: an optional leading +, then digits
 * with spaces, dashes, dots or brackets between them. Deliberately looser than
 * E.164 because the footer prints the line as well as linking it - '+91 93568
 * 98277' is what belongs there.
 *
 * The same rule as the Contact page's direct lines
 * (contact-page/validators/contact-details.validator.ts), copied rather than
 * imported because it is private to that module - and one number accepted on
 * /contact and refused in the footer would be a bug report waiting to happen,
 * so the two copies have to move together.
 */
const PHONE_SHAPE = /^\+?[0-9][0-9\s\-().]*$/;

/** E.164 allows 15 digits; below 8 it cannot be a reachable number. */
const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 15;

const digitsOf = (value: string): string => value.replace(/\D/g, '');

/**
 * Checks a number the site turns into a `tel:` link. The site strips everything
 * but the digits and a leading + at the point of use, so what has to hold is
 * that enough digits survive that stripping - a check on the punctuation alone
 * would pass '+(-) -' and ship a dead link.
 */
function validatePhoneLike(v: Validator, field: string, value: string): void {
  if (!value) return;

  if (!PHONE_SHAPE.test(value)) {
    v.custom(
      false,
      field,
      `${field} must be digits, optionally starting with + and separated by spaces, dashes or brackets`,
      'INVALID_PHONE',
    );
    return;
  }

  const digits = digitsOf(value).length;
  v.custom(
    digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS,
    field,
    `${field} must contain between ${MIN_PHONE_DIGITS} and ${MAX_PHONE_DIGITS} digits`,
    'INVALID_PHONE',
  );
}

/**
 * A bare host the way a footer prints one - 'www.upwon.in', 'upwon.in/about',
 * 'shop.upwon.in:8443' - with no scheme in front of it.
 *
 * Dotted labels of letters, digits and hyphens ending in a real-looking top
 * level (punycode included), an optional port, then an optional path, query or
 * fragment with no whitespace. Nothing before the host: that is what keeps
 * 'javascript:alert(1)', 'mailto:x@y.in' and 'user@evil.example' out - the
 * site prefixes https:// to whatever passes here, and each of those would
 * otherwise become a link that says one thing and goes somewhere else.
 */
const BARE_HOST =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})(?::[0-9]{1,5})?(?:[/?#]\S*)?$/i;

/**
 * A WEBSITE line: a bare host (the site adds https://) or a full http(s) URL.
 * Everything else is refused rather than escaped, because the value goes
 * straight into an href on every page of the site.
 */
function validateWebsite(v: Validator, field: string, value: string): void {
  if (!value) return;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  const ok = hasScheme ? isAbsoluteHttpUrl(value) : BARE_HOST.test(value);

  v.custom(
    ok,
    field,
    `${field} must be a web address, such as www.upwon.in or https://www.upwon.in`,
    'INVALID_URL',
  );
}

const isKnownKind = (raw: unknown): raw is SocialContactLineKind =>
  typeof raw === 'string' && (SOCIAL_CONTACT_LINE_KINDS as readonly string[]).includes(raw);

/**
 * Reads `value` against the rule for `kind`, returning it as it will be stored:
 * trimmed, and lowercased when it is an email address.
 *
 * One function for the three places a value meets a kind - a create, an edit
 * that sends both, and the service's re-check of an edit that sends only one -
 * so a number cannot be accepted on one path and refused on another.
 */
function readValueForKind(v: Validator, kind: SocialContactLineKind): string {
  switch (kind) {
    case 'ADDRESS':
      return v.requiredString('value', { min: ADDRESS_MIN, max: ADDRESS_MAX });

    case 'EMAIL':
      // The server-wide email pattern, capped at 254 and lowercased - the
      // same reading every other email in this API gets.
      return v.requiredEmail('value');

    case 'PHONE': {
      const value = v.requiredString('value', { max: PHONE_MAX });
      validatePhoneLike(v, 'value', value);
      return value;
    }

    case 'WEBSITE': {
      const value = v.requiredString('value', { max: WEBSITE_MAX });
      validateWebsite(v, 'value', value);
      return value;
    }
  }
}

/**
 * The value when the kind it has to be checked against is not in hand: the
 * kind was sent but is not one of the four (that error is already reported,
 * and checking the value against a kind nobody chose would only add a second,
 * misleading one), or an edit sent the value alone and the service will check
 * it against the row's current kind. Only the column's own limits apply here.
 */
function readValueLoosely(v: Validator): string {
  return v.requiredString('value', { max: VALUE_MAX });
}

export function validateCreateSocialContactLine(body: unknown): CreateSocialContactLineInput {
  const v = validator(body);

  const rawKind = (body as { kind?: unknown } | null)?.kind;
  const kind = v.requiredEnum('kind', SOCIAL_CONTACT_LINE_KINDS);

  const dto: CreateSocialContactLineInput = {
    kind,
    icon: readSocialMediaIcon(v, true) as string,
    value: isKnownKind(rawKind) ? readValueForKind(v, rawKind) : readValueLoosely(v),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A partial edit of one line.
 *
 * When the edit carries both a kind and a value they are checked together here,
 * so every mistake in the body comes back in one 422. When it carries only one
 * of them, the other half is the row's - which only the service can read - so
 * the value is held to the column's limits here and to its kind's rule there:
 * see contactLinesService.update.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows, which rewrite the whole set at once.
 */
export function validateUpdateSocialContactLine(body: unknown): UpdateSocialContactLineInput {
  const v = validator(body);

  v.requireAtLeastOne(['kind', 'icon', 'value', 'status']);

  const rawKind = (body as { kind?: unknown } | null)?.kind;

  let value: string | undefined;
  if (v.has('value')) {
    value = isKnownKind(rawKind) ? readValueForKind(v, rawKind) : readValueLoosely(v);
  }

  const dto: UpdateSocialContactLineInput = {
    kind: v.optionalEnum('kind', SOCIAL_CONTACT_LINE_KINDS),
    icon: readSocialMediaIcon(v, false),
    value,
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/**
 * The service's half of an edit that changes the kind or the value but not
 * both: the value that will be stored, checked against the kind it will be
 * stored under. Throws a 422 naming `value` - the field the admin form shows
 * the text in - when the pair does not fit.
 */
export function validateSocialContactLineValue(
  kind: SocialContactLineKind,
  value: string,
): string {
  const v = validator({ value });
  const normalised = readValueForKind(v, kind);
  v.assert();
  return normalised;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateSocialContactLineStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every line's id, in its new order - a whole-set rewrite. */
export function validateReorderSocialContactLines(
  body: unknown,
): ReorderSocialContactLinesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_SOCIAL_CONTACT_LINES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one contact line id', 'REQUIRED');

  // uuidArray dedupes silently; a duplicated id would become a partial reorder
  // with two rows fighting over one position.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}

/** The admin list: a search box and a status filter, no paging. */
export function validateSocialContactLineListQuery(
  query: Record<string, unknown>,
): SocialContactLineFilters {
  const v = validator(query);
  const filters: SocialContactLineFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
