// src/modules/product-pages/erp-page/utils/icons.ts

/**
 * The icons an administrator may pick, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the
 * name and the site maps it back to a component through a lookup of exactly
 * these keys.
 *
 * An allowlist rather than "any lucide name" for two reasons: an unknown name
 * would render nothing at all on the live page, and lucide ships well over a
 * thousand icons, which is a picker nobody can use. This set is the union of
 * what the section already draws plus a handful of near neighbours an
 * administrator is likely to reach for when adding an industry.
 *
 * Adding one means adding it here, to the admin's mirror of this list, and to
 * the site's lookup. All three are checked by the same names, so a name that
 * exists in one and not the others fails loudly rather than silently.
 */
export const ERP_ICON_NAMES = [
  // Already used by the industry switcher and its features.
  'Boxes',
  'Cake',
  'CalendarClock',
  'ClipboardCheck',
  'CupSoda',
  'Droplets',
  'Factory',
  'FlaskConical',
  'IceCream',
  'Package',
  'Pill',
  'Popcorn',
  'Rocket',
  'Route',
  'Settings',
  'ShieldCheck',
  'Snowflake',
  'Soup',
  'Store',
  'Target',
  'Timer',
  'TrendingUp',
  'Truck',
  'Users',
  // The ticks on the benefits journey's measurable outcomes.
  'CheckCircle2',
  'Check',
  'CircleCheck',
  // Near neighbours, for industries and features not yet written.
  'Award',
  'BadgeCheck',
  'BarChart3',
  'Beef',
  'Coffee',
  'FileCheck',
  'Flame',
  'Headset',
  'Leaf',
  'Milk',
  'Scale',
  'Search',
  'ShoppingCart',
  'SlidersHorizontal',
  'Sparkles',
  'Thermometer',
  'Wheat',
  'Wrench',
] as const;

export type ErpIconName = (typeof ERP_ICON_NAMES)[number];

export const isErpIconName = (value: string): value is ErpIconName =>
  (ERP_ICON_NAMES as readonly string[]).includes(value);
