// src/modules/product-pages/hreasy-page/utils/icons.ts

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
 * networks, the POS page's for the counter, and this one for a workforce -
 * people, shifts, payroll, compliance. A picker is only useful when it offers
 * the handful of icons that suit the section in front of you.
 *
 * Adding one means adding it here and to the site's lookup, which is checked
 * by the same names - so a name in one and not the other fails loudly.
 */
export const HREASY_ICON_NAMES = [
  // Already used by the closing band's buttons and its trust strip.
  'CalendarDays',
  'Users',
  'ShieldCheck',
  'Lock',
  'Clock',

  // Near neighbours, for sections not yet written.
  'Award',
  'BadgeCheck',
  'Banknote',
  'BarChart3',
  'Briefcase',
  'Building2',
  'CalendarCheck',
  'ClipboardList',
  'Coins',
  'Factory',
  'Fingerprint',
  'FileCheck',
  'Gauge',
  'GraduationCap',
  'HandCoins',
  'HeartHandshake',
  'IndianRupee',
  'Layers',
  'MapPin',
  'Receipt',
  'Scale',
  'Settings',
  'Smartphone',
  'Sparkles',
  'Target',
  'TrendingUp',
  'UserCheck',
  'UserPlus',
  'Wallet',
  'Workflow',
] as const;

export type HreasyIconName = (typeof HREASY_ICON_NAMES)[number];

export const isHreasyIconName = (value: string): value is HreasyIconName =>
  (HREASY_ICON_NAMES as readonly string[]).includes(value);
