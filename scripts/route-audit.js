/**
 * Structural check: walks the built router and asserts that every route past
 * /auth carries at least one guard in front of its handler.
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

function mountPathOf(layer) {
  // Express stores the mount path as a regexp. Recover a readable prefix from
  // the layer's own keys where possible, else fall back to the source.
  const source = layer.regexp && layer.regexp.source ? layer.regexp.source : '';
  const match = source.match(/^\^\\\/([A-Za-z0-9_-]+)/);
  return match ? '/' + match[1] : '';
}

function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      routes.push({
        path: prefix + layer.route.path,
        methods,
        handlerCount: layer.route.stack.length,
      });
    } else if (layer.handle && layer.handle.stack) {
      walk(layer.handle.stack, prefix + mountPathOf(layer));
    }
  }
}

walk(apiRouter.stack, '');

routes.sort((a, b) => a.path.localeCompare(b.path));

console.log(`\nRegistered routes: ${routes.length}\n`);
for (const route of routes) {
  const guarded = route.handlerCount > 1 ? 'guarded' : 'NO GUARD';
  console.log(
    `  ${route.methods.join(',').padEnd(7)} ${route.path.padEnd(30)} ${guarded}`,
  );
}

/**
 * Prefixes that are unauthenticated by design:
 *
 *   /auth    - login and password reset, self-guarded per route.
 *   /public  - read-only published CMS content for the marketing site, which is
 *              an anonymous browser client and so can hold neither an admin
 *              token nor an API key. Exempted explicitly rather than left to
 *              pass on a rate limiter being counted as a "guard", which is what
 *              the handlerCount heuristic would otherwise do.
 *
 * Note: mountPathOf only recovers the first segment of a nested mount, so a
 * route mounted at /public/home-page reports as /public/... here. That is a
 * display limitation; the prefix match below is unaffected.
 */
const PUBLIC_BY_DESIGN = ['/auth', '/public'];

const isPublicByDesign = (path) =>
  PUBLIC_BY_DESIGN.some((prefix) => path === prefix || path.startsWith(prefix + '/'));

// Every route that is not public by design must have a guard ahead of its
// controller.
const unguarded = routes.filter(
  (route) => route.handlerCount < 2 && !isPublicByDesign(route.path),
);

// The /public surface is read-only. A write there would be an unauthenticated
// mutation, which no amount of rate limiting makes acceptable.
const publicWrites = routes.filter(
  (route) =>
    route.path.startsWith('/public') &&
    route.methods.some((method) => method !== 'GET' && method !== 'HEAD'),
);

console.log('');
if (unguarded.length > 0) {
  console.error(`FAIL: ${unguarded.length} route(s) with no guard:`);
  for (const route of unguarded) {
    console.error(`   ${route.methods.join(',')} ${route.path}`);
  }
  process.exit(1);
}

if (publicWrites.length > 0) {
  console.error(`FAIL: ${publicWrites.length} unauthenticated write route(s) under /public:`);
  for (const route of publicWrites) {
    console.error(`   ${route.methods.join(',')} ${route.path}`);
  }
  process.exit(1);
}

console.log('PASS: every non-public route has a guard ahead of its handler.');
console.log('PASS: the /public surface is read-only.\n');
