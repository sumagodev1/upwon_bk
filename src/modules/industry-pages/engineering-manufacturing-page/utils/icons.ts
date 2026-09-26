// src/modules/industry-pages/engineering-manufacturing-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys (src/lib/engineeringIcons.js on the website).
 *
 * Curated for manufacturing - plants, materials, stock, dispatch - the same way
 * each product page keeps its own list. Adding one means adding it here and to
 * the site's lookup.
 */
export const ENGINEERING_ICON_NAMES = [
  // Already used by the trust section's three cards.
  'Boxes',
  'Factory',
  'BarChart3',

  // Already used by the core capabilities' eight cards (with BarChart3 and
  // Warehouse, listed elsewhere here).
  'ShoppingCart',
  'FileText',
  'Settings',
  'ShieldCheck',
  'Database',
  'Activity',

  // Already used by the connected platform section's workflows (with the
  // icons above, and Truck, Users and Warehouse below).
  'ClipboardList',
  'UserCog',

  // Already used by the industry coverage grid (with Settings, Factory,
  // Wrench, Cog, Layers, Package and Building2, listed elsewhere here).
  'Bot',
  'Cpu',
  'Car',
  'WashingMachine',
  'Handshake',

  // Near neighbours, for cards not yet written.
  'Award',
  'BadgeCheck',
  'Building2',
  'ClipboardCheck',
  'Clock',
  'Cog',
  'Gauge',
  'Globe',
  'Hammer',
  'Layers',
  'MapPin',
  'Network',
  'Package',
  'Route',
  'Sparkles',
  'Target',
  'TrendingUp',
  'Truck',
  'Users',
  'Warehouse',
  'Workflow',
  'Wrench',
] as const;

export type EngineeringIconName = (typeof ENGINEERING_ICON_NAMES)[number];

export const isEngineeringIconName = (value: string): value is EngineeringIconName =>
  (ENGINEERING_ICON_NAMES as readonly string[]).includes(value);
