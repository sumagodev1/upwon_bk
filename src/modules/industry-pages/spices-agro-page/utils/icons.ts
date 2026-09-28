// src/modules/industry-pages/spices-agro-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys (src/lib/spicesAgroIcons.js on the website).
 *
 * Curated for spices and agro-processing - harvest, grading, processing,
 * storage, distribution - the same way each page keeps its own list. Adding
 * one means adding it here and to the site's lookup.
 */
export const SPICES_AGRO_ICON_NAMES = [
  // Already used by the core capabilities.
  'Boxes',
  'ShoppingCart',
  'Factory',
  'ShieldCheck',
  'Package',
  'Warehouse',
  'ClipboardCheck',
  'BarChart3',

  // Near neighbours, for entries not yet written.
  'Award',
  'BadgeCheck',
  'Bean',
  'Building2',
  'Citrus',
  'ClipboardList',
  'Clock',
  'Droplets',
  'Flame',
  'Gauge',
  'Globe',
  'Layers',
  'Leaf',
  'MapPin',
  'Network',
  'Nut',
  'PieChart',
  'Receipt',
  'Route',
  'Scale',
  'Settings',
  'Sparkles',
  'Sprout',
  'Store',
  'Target',
  'Thermometer',
  'Tractor',
  'TrendingUp',
  'Truck',
  'Users',
  'Wheat',
  'Workflow',
] as const;

export type SpicesAgroIconName = (typeof SPICES_AGRO_ICON_NAMES)[number];

export const isSpicesAgroIconName = (value: string): value is SpicesAgroIconName =>
  (SPICES_AGRO_ICON_NAMES as readonly string[]).includes(value);
