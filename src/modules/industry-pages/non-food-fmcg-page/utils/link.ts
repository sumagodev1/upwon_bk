// src/modules/industry-pages/non-food-fmcg-page/utils/link.ts

import { Validator } from '../../../../core/utils/validation';

/**
 * Shared URL checks for this page's media and buttons.
 *
 * Both accept the same two shapes - an absolute http(s) URL, or a path
 * starting with '/' - because both end up in an attribute the browser
 * resolves, and the schemes worth blocking there (`javascript:`, `data:`) are
 * exactly the ones a validator can enumerate away.
 */

function validateHref(v: Validator, field: string, value: string, kind: string): void {
  if (value.startsWith('/')) {
    v.custom(
      !value.startsWith('//'),
      field,
      `${field} must not be protocol-relative; give a full https:// URL instead`,
      'INVALID_URL',
    );
    return;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  v.custom(
    parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:'),
    field,
    `${field} must be an https:// URL or a ${kind} path starting with '/'`,
    'INVALID_URL',
  );
}

/** For image and video sources. */
export const validateMediaUrl = (v: Validator, field: string, value: string): void =>
  validateHref(v, field, value, 'site-relative');

/**
 * For button targets.
 *
 * Same rules as a media URL: '/demo' stays an in-app route, and an absolute
 * URL is allowed so a button can point at something off-site.
 */
export const validateLinkHref = (v: Validator, field: string, value: string): void =>
  validateHref(v, field, value, 'route');
