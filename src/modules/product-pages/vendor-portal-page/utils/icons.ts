// src/modules/product-pages/vendor-portal-page/utils/icons.ts

/**
 * The icons an administrator may pick on the Vendor Portal page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys.
 *
 * A separate list from the other product pages' rather than one shared
 * registry: the WMS page's is curated for a warehouse, the POS page's for the
 * counter, and this one for procurement - vendors, quotes, contracts,
 * inspections and payments. A picker is only useful when it offers the handful
 * of icons that suit the section in front of you.
 *
 * Adding one means adding it here and to the site's lookup, which is checked
 * by the same names - so a name in one and not the other fails loudly.
 */
export const VMS_ICON_NAMES = [
  // Already used by the proof strip's metric tiles.
  'UserRoundPlus',
  'Clock3',
  'ShieldCheck',

  // Near neighbours, for sections not yet written and for editors adding
  // their own tiles.
  'BadgeCheck',
  'Banknote',
  'Building2',
  'ClipboardCheck',
  'ClipboardList',
  'Clock',
  'Contact',
  'CreditCard',
  'FileCheck2',
  'FileSearch',
  'FileSpreadsheet',
  'FileText',
  'Gauge',
  'Handshake',
  'Layers',
  'Lock',
  'MessageSquare',
  'Package',
  'PackageCheck',
  'Percent',
  'ReceiptText',
  'Scale',
  'ScrollText',
  'Search',
  'Send',
  'ShieldAlert',
  'Sparkles',
  'Star',
  'Target',
  'TrendingDown',
  'TrendingUp',
  'Truck',
  'UserRoundCheck',
  'Users',
  'Wallet',
] as const;

export type VmsIconName = (typeof VMS_ICON_NAMES)[number];

export const isVmsIconName = (value: string): value is VmsIconName =>
  (VMS_ICON_NAMES as readonly string[]).includes(value);
