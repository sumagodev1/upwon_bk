// src/modules/industry-pages/beverage-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys (src/lib/beverageIcons.js on the website).
 *
 * Curated for beverages - ingredients, batches, bottles, cold chain,
 * distribution - the same way each page keeps its own list. Adding one means
 * adding it here and to the site's lookup.
 */
export const BEVERAGE_ICON_NAMES = [
  // Already used by the connected platform section's workflows.
  'ShoppingCart',
  'Leaf',
  'ClipboardList',
  'ShieldCheck',
  'Settings',
  'Package',
  'Boxes',
  'Clock',
  'Warehouse',
  'BarChart3',
  'Truck',
  'MapPin',
  'PieChart',

  // Already used by the industry coverage grid (with CupSoda, GlassWater,
  // Sparkles, Wine, Droplet, Droplets, Milk, FlaskConical and MapPin, listed
  // elsewhere here).
  'Grape',
  'Zap',
  'HeartPulse',

  // Near neighbours, for workflows not yet written.
  'Apple',
  'Award',
  'BadgeCheck',
  'Building2',
  'Citrus',
  'CupSoda',
  'Droplet',
  'Droplets',
  'Factory',
  'FlaskConical',
  'Gauge',
  'GlassWater',
  'Layers',
  'Milk',
  'Network',
  'Receipt',
  'Route',
  'Snowflake',
  'Sparkles',
  'Store',
  'Target',
  'Thermometer',
  'TrendingUp',
  'Users',
  'Wine',
  'Workflow',
] as const;

export type BeverageIconName = (typeof BEVERAGE_ICON_NAMES)[number];

export const isBeverageIconName = (value: string): value is BeverageIconName =>
  (BEVERAGE_ICON_NAMES as readonly string[]).includes(value);
