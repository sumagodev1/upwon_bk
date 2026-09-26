// src/modules/social-media-links/validators/shared.ts

import { Validator } from '../../../core/utils/validation';
import {
  isSocialMediaIconName,
  SOCIAL_MEDIA_ICON_NAMES,
  SocialMediaIconName,
} from '../utils/icons';

/** Matches icon VARCHAR(60) on both of 048_social_media_links.sql's tables. */
const ICON_MAX = 60;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render nothing at all in the live footer - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 *
 * On an edit the icon is optional: absent means "leave it alone".
 */
export function readSocialMediaIcon(
  v: Validator,
  required: boolean,
): SocialMediaIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: ICON_MAX })
    : (v.optionalString('icon', { max: ICON_MAX }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isSocialMediaIconName(raw),
    'icon',
    `icon must be one of the available icons: ${SOCIAL_MEDIA_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isSocialMediaIconName(raw) ? raw : undefined;
}

/** The literal prefix social_links_url_shape_check tests with ~* '^https?://'. */
const HTTP_PREFIX = /^https?:\/\//i;

const WHITESPACE = /\s/;

/**
 * An absolute http(s) URL that leads somewhere on the public internet.
 *
 * Stricter than the content-url rule the page sections use, and on purpose:
 * these values are links OFF the site - a profile, a company website - so a
 * site-relative path is not one of the shapes they can take, and neither is
 * anything the browser would resolve against the page.
 *
 *   the literal prefix   Tested on the text, not only on the parsed URL: the
 *                        WHATWG parser reads 'https:x.com' and 'https:/x.com'
 *                        as https://x.com/, but the stored string would then
 *                        fail the column's CHECK - a 500 naming no field - and
 *                        the site's own ^https?:// re-check would drop it.
 *   no whitespace        The parser percent-encodes a space in a path, so it
 *                        would pass; a URL with a space in it is a typo.
 *   a dotted hostname    'https://localhost' parses, and is nobody's profile.
 *   no credentials       'https://www.linkedin.com@evil.example' parses as a
 *                        link to evil.example that reads as LinkedIn - the
 *                        shape of a phishing link, and never what anybody
 *                        meant to put in a footer.
 *
 * `javascript:`, `data:` and every other scheme fail the prefix, which is the
 * point of testing it first.
 */
export function isAbsoluteHttpUrl(value: string): boolean {
  if (!HTTP_PREFIX.test(value) || WHITESPACE.test(value)) return false;

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  return (
    parsed !== null &&
    (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
    parsed.hostname.includes('.') &&
    parsed.username === '' &&
    parsed.password === ''
  );
}
