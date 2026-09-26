// src/core/utils/client-ip.ts

import { isIP } from 'node:net';

/**
 * Turns Express's req.ip into something an INET column will accept, or null.
 *
 * req.ip is a string Express derived from the socket or, behind a proxy, from
 * a header a client can set. An INET column will not take a malformed one, and
 * a failed cast would turn a real submission into a 500 and lose it - so
 * anything that is not plainly an address is filed as "unknown" instead.
 *
 * '::ffff:127.0.0.1' is unwrapped to '127.0.0.1': Postgres would store the
 * mapped form as an IPv6 address, and these inboxes are triaged by IPv4
 * addresses.
 *
 * Parsed with net.isIP rather than pattern-matched. A character-class test
 * ("only hex digits, dots and colons") is not an address test: 'cafe', '...',
 * '1.2.3.4.5' and 'deadbeef' all pass one and none of them is valid inet
 * input, so the cast this function exists to prevent would still throw and
 * still lose the submission. isIP accepts exactly what INET accepts for a bare
 * address, and this value is not one Express guarantees - with trust proxy on,
 * which is the production default, it is whatever the last X-Forwarded-For
 * entry says.
 *
 * Lives here rather than in one module because both public write endpoints -
 * the Contact enquiry form and the Careers application form - store the
 * submitter's address in an INET column, and a second copy of this reasoning
 * would be one copy too many.
 */
export const toInetOrNull = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const unmapped =
    trimmed.toLowerCase().startsWith('::ffff:') && trimmed.includes('.')
      ? trimmed.slice('::ffff:'.length)
      : trimmed;
  return isIP(unmapped) !== 0 ? unmapped : null;
};

/** A header is not a document. Anything past this is noise or an attack. */
export const USER_AGENT_MAX = 1000;
