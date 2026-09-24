// src/modules/product-pages/fms-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys.
 *
 * A separate list from the other product pages' rather than one shared
 * registry: the ERP page's is curated for food and FMCG industries, the
 * SFA-DMS page's for distribution stages, and this one for franchise networks -
 * outlets, plants, orders, territories. A picker is only useful when it offers
 * the handful of icons that suit the section in front of you.
 *
 * Adding one means adding it here and to the site's lookup, which is checked by
 * the same names - so a name in one and not the other fails loudly.
 */
export const FMS_ICON_NAMES = [
  // Already used by the proof strip's four figures.
  'Store',
  'Factory',
  'ShoppingCart',

  // Added for the franchise category map's flow and benefits strip.
  'BarChart3',
  'Trash2',

  // Near neighbours, for figures not yet written.
  'Award',
  'BadgeCheck',
  'Boxes',
  'Building2',
  'Cake',
  'ChefHat',
  'Clock',
  'Coins',
  'Globe',
  'Handshake',
  'IndianRupee',
  'Layers',
  'MapPin',
  'Network',
  'Package',
  'Percent',
  'Receipt',
  'Route',
  'ShieldCheck',
  'Sparkles',
  'Target',
  'TrendingUp',
  'Truck',
  'Users',
  'Utensils',
  'Warehouse',
  'Workflow',
] as const;

export type FmsIconName = (typeof FMS_ICON_NAMES)[number];

export const isFmsIconName = (value: string): value is FmsIconName =>
  (FMS_ICON_NAMES as readonly string[]).includes(value);
