// src/modules/industry-pages/qsr-franchise-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys (src/lib/qsrFranchiseIcons.js on the website).
 *
 * Curated for QSR and franchise food businesses - kitchens, outlets, orders,
 * stock, people - the same way each page keeps its own list. Adding one means
 * adding it here and to the site's lookup.
 */
export const QSR_FRANCHISE_ICON_NAMES = [
  // Already used by the trust section's stat tiles.
  'UtensilsCrossed',
  'Warehouse',
  'Store',

  // Already used by the core capabilities.
  'ShoppingCart',
  'Factory',
  'FileText',
  'Package',
  'BarChart3',
  'Users',
  'PieChart',

  // Already used by the connected platform.
  'ClipboardList',
  'CookingPot',
  'TrendingUp',
  'MapPin',
  'Truck',
  'Receipt',

  // Already used by the industry coverage.
  'Sandwich',
  'Coffee',
  'ChefHat',
  'Cloud',
  'Building2',
  'CakeSlice',
  'IceCreamCone',
  'Bike',

  // Near neighbours, for entries not yet written.
  'Award',
  'BadgeCheck',
  'Boxes',
  'ClipboardCheck',
  'Clock',
  'CreditCard',
  'Gauge',
  'Globe',
  'Layers',
  'Network',
  'Pizza',
  'Route',
  'Settings',
  'ShieldCheck',
  'ShoppingBag',
  'Soup',
  'Sparkles',
  'Target',
  'Thermometer',
  'Workflow',
] as const;

export type QsrFranchiseIconName = (typeof QSR_FRANCHISE_ICON_NAMES)[number];

export const isQsrFranchiseIconName = (value: string): value is QsrFranchiseIconName =>
  (QSR_FRANCHISE_ICON_NAMES as readonly string[]).includes(value);
