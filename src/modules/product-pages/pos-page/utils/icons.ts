// src/modules/product-pages/pos-page/utils/icons.ts

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
 * SFA-DMS page's for distribution stages, the FMS page's for franchise
 * networks, and this one for the counter - billing, payments, receipts, and
 * the kinds of food business that stand behind one. A picker is only useful
 * when it offers the handful of icons that suit the section in front of you.
 *
 * Adding one means adding it here and to the site's lookup, which is checked
 * by the same names - so a name in one and not the other fails loudly.
 */
export const POS_ICON_NAMES = [
  // Already used by the proof strip's four figures.
  'ShoppingBag',
  'Wallet',
  'Timer',
  'Store',

  // Added for the category map's cards.
  'Croissant',
  'Candy',
  'Sandwich',
  'IceCreamCone',
  'UtensilsCrossed',
  'ChefHat',
  'CupSoda',
  'Sparkles',

  // Added for the security band's badges, its data strip and its assurances.
  'FileCheck',
  'Award',
  'Lock',
  'Eye',
  'UserRound',

  // Near neighbours, for figures and categories not yet written.
  'Banknote',
  'BadgeCheck',
  'BarChart3',
  'Calculator',
  'CreditCard',
  'Clock',
  'Coins',
  'Gift',
  'IndianRupee',
  'Layers',
  'MapPin',
  'Monitor',
  'Package',
  'Percent',
  'Printer',
  'QrCode',
  'Receipt',
  'RefreshCcw',
  'Scan',
  'ShieldCheck',
  'ShoppingCart',
  'Smartphone',
  'Tag',
  'Target',
  'TrendingUp',
  'Users',
  'Utensils',
  'Zap',
] as const;

export type PosIconName = (typeof POS_ICON_NAMES)[number];

export const isPosIconName = (value: string): value is PosIconName =>
  (POS_ICON_NAMES as readonly string[]).includes(value);
