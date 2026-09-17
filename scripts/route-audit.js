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

// /auth routes are intentionally public or self-guarded; everything else must
// have a guard middleware ahead of its controller.
const unguarded = routes.filter(
  (route) => route.handlerCount < 2 && !route.path.startsWith('/auth'),
);

console.log('');
if (unguarded.length > 0) {
  console.error(`FAIL: ${unguarded.length} route(s) with no guard:`);
  for (const route of unguarded) {
    console.error(`   ${route.methods.join(',')} ${route.path}`);
  }
  process.exit(1);
}

console.log('PASS: every non-auth route has a guard ahead of its handler.\n');
