/**
 * Structural check: walks the built router and asserts that every route past
 * /auth carries at least one guard in front of its handler, and that the only
 * unauthenticated writes under /public are the ones named below.
 *
 * This is worth more than most unit tests here - a single route registered
 * without requirePermission is an open endpoint, and it is invisible in review.
 *
 * Run: npm run build && node scripts/route-audit.js
 */
// routes/index.ts uses `export default router`, so with esModuleInterop the
// router lands on `.default`.
const routesModule = require('../dist/routes/index.js');
const apiRouter = routesModule.default ?? routesModule;

const routes = [];

/**
 * Express compiles a literal mount path to /^\/a\/b\/?(?=\/|$)/i - only the
 * slashes are escaped. Recovering the WHOLE path matters now that the public
 * write allowlist below is matched against it: a decoder that recovered only
 * the first segment would turn '/public/contact-page/enquiries' into
 * '/public/enquiries' and make the allowlist entry a fiction.
 *
 * Anything that is not a plain literal path - a mount carrying a :param, which
 * compiles to a capture group - cannot be recovered from the compiled regexp,
 * and is reported as UNDECODABLE rather than as ''.
 *
 * That distinction is the whole point. Returning '' for an unreadable mount
 * looks harmless - the route "just prints shorter" - but it silently moves the
 * route out from under its prefix: a POST registered under
 * router.use('/public/:site', r) would be recorded as '/subscribe', which does
 * not start with '/public', so the public-write allowlist below never sees it,
 * and it is not public-by-design either, so it falls through to the
 * handlerCount heuristic and passes as "guarded" on the strength of having a
 * rate limiter in front of it. An unauthenticated mutation would then be
 * blessed by the very check written to catch it. A backstop that cannot read a
 * route must refuse to bless it, so an undecodable mount fails the audit.
 *
 * A mount of '/' - router.use(subRouter) with no path - is not undecodable; it
 * contributes nothing to the path and decodes to '' as it should.
 */
const LITERAL_MOUNT = /^\^(.*)\\\/\?\(\?=\\\/\|\$\)$/;
const REGEXP_METACHARACTER = /(^|[^\\])[.*+?^${}()|[\]]/;

const UNDECODABLE = Symbol('undecodable mount');

function mountPathOf(layer) {
  const regexp = layer.regexp;
  // Express marks a '/' mount, which is the one case where nothing to decode
  // is the right answer rather than a failure to read.
  if (regexp && regexp.fast_slash) return '';

  const source = regexp && regexp.source ? regexp.source : '';
  const match = source.match(LITERAL_MOUNT);
  if (!match) return UNDECODABLE;

  const body = match[1];
  if (body === '') return '';
  if (REGEXP_METACHARACTER.test(body)) return UNDECODABLE;

  const path = body.replace(/\\(.)/g, '$1');
  return path === '/' ? '' : path;
}

/** '/admins/' and '/admins' are one route; print and match them as one. */
const normalize = (path) => path.replace(/\/+$/, '') || '/';

function walk(stack, prefix, undecoded) {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      routes.push({
        path: normalize(prefix + layer.route.path),
        methods,
        handlerCount: layer.route.stack.length,
        // The printed path is missing at least one mount, so it is not the
        // path this route actually answers on and cannot be reasoned about.
        undecoded,
      });
    } else if (layer.handle && layer.handle.stack) {
      const mount = mountPathOf(layer);
      const unreadable = mount === UNDECODABLE;
      walk(layer.handle.stack, prefix + (unreadable ? '' : mount), undecoded || unreadable);
    }
  }
}

walk(apiRouter.stack, '', false);

routes.sort((a, b) => a.path.localeCompare(b.path));

console.log(`\nRegistered routes: ${routes.length}\n`);
for (const route of routes) {
  const guarded = route.handlerCount > 1 ? 'guarded' : 'NO GUARD';
  const note = route.undecoded ? '  (mount path unreadable)' : '';
  console.log(
    `  ${route.methods.join(',').padEnd(7)} ${route.path.padEnd(40)} ${guarded}${note}`,
  );
}

/**
 * Prefixes that are unauthenticated by design:
 *
 *   /auth    - login and password reset, self-guarded per route.
 *   /public  - published CMS content for the marketing site, which is an
 *              anonymous browser client and so can hold neither an admin token
 *              nor an API key. Exempted explicitly rather than left to pass on
 *              a rate limiter being counted as a "guard", which is what the
 *              handlerCount heuristic would otherwise do.
 */
const PUBLIC_BY_DESIGN = ['/auth', '/public'];

const isPublicByDesign = (path) =>
  PUBLIC_BY_DESIGN.some((prefix) => path === prefix || path.startsWith(prefix + '/'));

/**
 * ── THE PUBLIC WRITE ALLOWLIST ───────────────────────────────────────────
 *
 * This check used to be "no writes under /public, ever". That was true until
 * the Contact page's enquiry form needed somewhere to send what a visitor
 * types, and a blanket rule with one exception is a rule that gets deleted the
 * first time it is inconvenient - leaving nothing behind it.
 *
 * So it is an allowlist instead, and it keeps the same teeth: a second
 * unauthenticated write, added by accident or arriving in a merge, still fails
 * this audit and has to be argued for here in writing. A stale entry fails it
 * too, so the list cannot quietly outlive the route it was written for.
 *
 * Every entry needs: why the caller cannot authenticate, and what stands in
 * for authentication.
 *
 *   POST /public/contact-page/enquiries
 *     The enquiry form on the marketing site's /contact page. The caller is an
 *     anonymous visitor in a browser, so there is no credential to present,
 *     and there is no mail transport in this project - the row it writes IS
 *     the delivery of the lead. In place of a guard it carries
 *     contactEnquiryRateLimit (5 per 15 minutes per IP, far below
 *     standardRateLimit), the 1mb express.json body cap, and a validator that
 *     bounds every field and checks the three choice fields against the
 *     options contact_form_section is currently publishing. It returns a
 *     receipt, never the stored row, and no public GET exists beside it.
 *     See src/modules/contact-page/routes/enquiries.routes.ts.
 *
 *   POST /public/careers/applications
 *     The Apply Now form in the vacancy popup on the marketing site's
 *     /careers page. Same reasoning as the enquiry form: an anonymous
 *     candidate in a browser has no credential to present, and with no mail
 *     transport in this project the row it writes IS the delivery of the
 *     application - the mailto: links it replaced at least failed visibly.
 *
 *     It differs in carrying a FILE, so it is guarded harder. This is the
 *     only route in the API where an unauthenticated caller can cause a write
 *     to storage. In place of a guard it carries careerApplicationRateLimit
 *     (3 per hour per IP, tighter than the enquiry form's 5 per 15 minutes,
 *     because every accepted request writes up to 5 MB), multer limited to
 *     one part of 5 MB, a resume check by declared mime type AND extension
 *     with the filename reduced to [A-Za-z0-9._ -] before it is stored or put
 *     in a header, a validator that bounds every field, and a check that the
 *     target is an ACTIVE vacancy - so an id kept from a role that has since
 *     been taken down cannot be used to keep applying. It returns a receipt,
 *     never the stored row.
 *
 *     The stored CV is NOT publicly readable: its entity type is deliberately
 *     absent from PUBLIC_FILE_ENTITY_TYPES, so /public/files cannot serve it,
 *     and the one route that can requires career_applications.read and
 *     records an audit entry every time.
 *     See src/modules/careers/routes/applications.routes.ts.
 *
 *   POST /public/partner-program/applications
 *     The "Apply to join" form at the foot of the marketing site's /partners
 *     page. Same reasoning as the other two: an anonymous visitor in a browser
 *     has no credential to present, and with no mail transport in this project
 *     the row it writes IS the delivery of the application. Before it existed
 *     that form's submit handler was a window.alert() and every partner who
 *     filled it in was silently discarded, which is worse than any of the risks
 *     below.
 *
 *     It is the mildest of the three: a JSON body of six short fields, no file,
 *     nothing written to storage, and nothing read from the CMS. In place of a
 *     guard it carries partnerApplicationRateLimit (5 per 15 minutes per IP,
 *     under a fixed name so the budget cannot be split by re-spelling the URL,
 *     the same shape as the enquiry form's), the 1mb express.json body cap, and
 *     a validator that bounds every field, checks the mobile number with the
 *     shared visitor-phone rule and the address as an address. It returns a
 *     receipt, never the stored row, and no public GET exists beside it - the
 *     list is readable only with partner_applications.read.
 *     See src/modules/partner-program/routes/applications.routes.ts.
 *
 *   POST /public/about-page/discovery-calls
 *     The "Three fields. 20 seconds." form at the foot of the marketing site's
 *     /about page, which books a 20-minute discovery call. Same reasoning as the
 *     other three: an anonymous visitor in a browser has no credential to
 *     present, and with no mail transport in this project the row it writes IS
 *     the delivery.
 *
 *     It replaces the worst failure of the four. The others at least failed
 *     visibly - a window.alert(), a mailto: link. This form called submitLead()
 *     in the website's src/lib/leads.js, which posts to VITE_LEAD_ENDPOINT when
 *     that variable is set and otherwise RESOLVES SUCCESSFULLY having sent
 *     nothing anywhere, so every visitor was shown "Talk soon" and nobody was
 *     ever told. Nothing below is worse than that.
 *
 *     It is the mildest of the four: a JSON body of three short fields - a name,
 *     a phone number and an optional line about the business - no file, nothing
 *     written to storage, and nothing read from the CMS. In place of a guard it
 *     carries discoveryCallRateLimit (5 per 15 minutes per IP, under a fixed
 *     name so the budget cannot be split by re-spelling the URL, the same shape
 *     as the enquiry form's), discoveryCallGlobalRateLimit (300 an hour on a
 *     constant key, the only bound that survives a spoofed X-Forwarded-For), the
 *     1mb express.json body cap, and a validator that bounds every field and
 *     checks the number with the shared visitor-phone rule. It returns a
 *     receipt, never the stored row, and no public GET exists beside it - the
 *     list is readable only with discovery_calls.read.
 *     See src/modules/about-page/routes/discovery-calls.routes.ts.
 *
 *   POST /public/free-audit/applications
 *     The "Request my free audit" form on the marketing site's /free-audit
 *     page. Same reasoning as the other four: an anonymous visitor in a browser
 *     has no credential to present, and with no mail transport in this project
 *     the row it writes IS the delivery. Before it existed the form's submit
 *     handler only showed its thank-you panel, so every request was discarded
 *     while the visitor was told it had been received.
 *
 *     It is shaped exactly like the discovery call form: a JSON body of seven
 *     short fields, no file, nothing written to storage, and nothing read from
 *     the CMS. In place of a guard it carries freeAuditApplicationRateLimit (5
 *     per 15 minutes per IP, under a fixed name of its own),
 *     freeAuditApplicationGlobalRateLimit (100 per 10 minutes keyed on the TCP
 *     peer, the only bound that survives a spoofed X-Forwarded-For), the 1mb
 *     express.json body cap, and a validator that bounds every field, checks
 *     the number with the shared visitor-phone rule, the address as an address
 *     and the revenue range against the four chips the page renders. It
 *     returns a receipt, never the stored row, and no public GET exists beside
 *     it - the list is readable only with free_audit_applications.read.
 *     See src/modules/free-audit/routes/applications.routes.ts.
 */
const PUBLIC_WRITE_ALLOWLIST = [
  'POST /public/contact-page/enquiries',
  'POST /public/careers/applications',
  'POST /public/partner-program/applications',
  'POST /public/about-page/discovery-calls',
  'POST /public/free-audit/applications',
];

const isWriteMethod = (method) => method !== 'GET' && method !== 'HEAD';

// One entry per method, so POST and DELETE on the same path are two decisions.
const publicWrites = [];
for (const route of routes) {
  if (!route.path.startsWith('/public')) continue;
  for (const method of route.methods) {
    if (isWriteMethod(method)) publicWrites.push(`${method} ${route.path}`);
  }
}

// Every route that is not public by design must have a guard ahead of its
// controller.
const unguarded = routes.filter(
  (route) => route.handlerCount < 2 && !isPublicByDesign(route.path),
);

const unlisted = publicWrites.filter((entry) => !PUBLIC_WRITE_ALLOWLIST.includes(entry));
const stale = PUBLIC_WRITE_ALLOWLIST.filter((entry) => !publicWrites.includes(entry));

// Routes whose real path this script could not work out. Every check above is
// a statement about a path, so for these it has no opinion - and "no opinion"
// must read as a failure, not as a pass.
const undecoded = routes.filter((route) => route.undecoded);

console.log('');
if (undecoded.length > 0) {
  console.error(
    `FAIL: the mount path could not be decoded for ${undecoded.length} route(s):`,
  );
  for (const route of undecoded) {
    console.error(`   ${route.methods.join(',')} ...${route.path}`);
  }
  console.error(
    '\n   A mount carrying a :param compiles to a capture group that cannot be',
  );
  console.error(
    '   read back, so these routes are missing a prefix and neither the guard',
  );
  console.error(
    '   check nor the public-write allowlist can be applied to them. Teach',
  );
  console.error(
    '   mountPathOf about the new mount shape, or mount the router literally.',
  );
  process.exit(1);
}
if (unguarded.length > 0) {
  console.error(`FAIL: ${unguarded.length} route(s) with no guard:`);
  for (const route of unguarded) {
    console.error(`   ${route.methods.join(',')} ${route.path}`);
  }
  process.exit(1);
}

if (unlisted.length > 0) {
  console.error(
    `FAIL: ${unlisted.length} unauthenticated write route(s) under /public that are not allowlisted:`,
  );
  for (const entry of unlisted) {
    console.error(`   ${entry}`);
  }
  console.error(
    '\n   An unauthenticated mutation is not made acceptable by rate limiting.',
  );
  console.error(
    '   If this one genuinely has to exist, add it to PUBLIC_WRITE_ALLOWLIST in',
  );
  console.error('   this script with the reasoning, as the entry there shows.');
  process.exit(1);
}

if (stale.length > 0) {
  console.error(`FAIL: ${stale.length} allowlisted public write(s) that no longer exist:`);
  for (const entry of stale) {
    console.error(`   ${entry}`);
  }
  console.error(
    '\n   Remove the entry, or fix the path it names - an allowlist nobody',
  );
  console.error('   maintains stops being one.');
  process.exit(1);
}

console.log('PASS: every non-public route has a guard ahead of its handler.');
console.log(
  `PASS: the /public surface is read-only apart from ${PUBLIC_WRITE_ALLOWLIST.length} allowlisted write(s):`,
);
for (const entry of PUBLIC_WRITE_ALLOWLIST) {
  console.log(`        ${entry}`);
}
console.log('');
