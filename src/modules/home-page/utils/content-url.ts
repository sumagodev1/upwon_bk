// src/modules/home-page/utils/content-url.ts

import { Validator } from '../../../core/utils/validation';

/**
 * The one rule for any URL an admin authors into public website content -
 * image sources and link targets alike: an absolute http(s) URL, or a
 * site-relative path like '/images/hero.webp' or '/clients/monginis'.
 *
 * Anything else is rejected rather than escaped: these values go straight into
 * an `src` or `href` attribute on the public site, and the schemes worth
 * blocking there (`javascript:`, `data:`) are exactly the ones a validator can
 * enumerate away. `code` lets each caller report the failure in its own terms.
 */
export function validateContentUrl(
  v: Validator,
  field: string,
  value: string,
  code: string,
): void {
  if (value.startsWith('/')) {
    /*
     * Both '//host' and '/\host' are protocol-relative: the URL parser folds a
     * backslash to a slash for http(s), so '/\evil.example/x.webp' resolves
     * cross-origin exactly as '//evil.example/x.webp' does. The clients mirror
     * this rule character for character (the admin's lib/contentUrl.ts and the
     * website's lib/contactPage.js both test /^\/[/\\]/), so all three copies
     * have to refuse the same two prefixes.
     */
    v.custom(
      !/^\/[/\\]/.test(value),
      field,
      `${field} must not start with '//' or '/\\'; give a full https:// URL instead`,
      code,
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
    `${field} must be an https:// URL or a site-relative path starting with '/'`,
    code,
  );
}
