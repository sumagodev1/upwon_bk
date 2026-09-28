// src/modules/product-pages/vendor-portal-page/utils/link.ts

import { Validator } from '../../../../core/utils/validation';

/**
 * Shared URL checks for this page's media and buttons.
 *
 * Three shapes are accepted - an absolute http(s) URL, a path starting with
 * '/', or an in-page anchor starting with '#' - because all three end up in an
 * attribute the browser resolves, and the schemes worth blocking there
 * (`javascript:`, `data:`) are exactly the ones a validator can enumerate away.
 *
 * The anchor is why this is not the WMS page's copy of the same file: the
 * closing band here links to '#contact' and '#vendor-base' rather than to
 * routes, and a validator that rejected those would reject the band the site
 * ships.
 */

function validateHref(v: Validator, field: string, value: string, kind: string): void {
  // An in-page anchor. '#' alone is a link to nowhere, so it needs a target.
  if (value.startsWith('#')) {
    v.custom(
      value.length > 1,
      field,
      `${field} must name a target after the '#'`,
      'INVALID_URL',
    );
    return;
  }

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
    `${field} must be an https:// URL, a ${kind} path starting with '/', or an anchor starting with '#'`,
    'INVALID_URL',
  );
}

/**
 * For image and video sources.
 *
 * An anchor is meaningless for a media source, so this rejects one - the
 * shared helper accepts it, which is right for a button and wrong here.
 */
export const validateMediaUrl = (v: Validator, field: string, value: string): void => {
  if (value.startsWith('#')) {
    v.custom(false, field, `${field} must be a URL or path, not an anchor`, 'INVALID_URL');
    return;
  }
  validateHref(v, field, value, 'site-relative');
};

/** For button targets: a route, an absolute URL, or an in-page anchor. */
export const validateLinkHref = (v: Validator, field: string, value: string): void =>
  validateHref(v, field, value, 'route');
