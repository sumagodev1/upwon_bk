// src/modules/product-pages/sfa-dms-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys.
 *
 * A separate list from the ERP page's rather than one shared registry: that
 * one is curated for food and FMCG industries (Cake, Milk, Popcorn), this one
 * for distribution stages. A picker is only useful when it offers the handful
 * of icons that suit the section in front of you.
 *
 * Adding one means adding it here and to the site's lookup, which is checked
 * by the same names - so a name in one and not the other fails loudly.
 */
export const SFA_ICON_NAMES = [
  /*
   * 'FieldRep' is the one name here that is not a lucide export. The SFA card
   * draws a person with a map pin clipped to the corner, which lucide has no
   * single icon for, so the site composes it from two. It is allowlisted like
   * any other name because from an editor's side it is simply another icon.
   */
  'FieldRep',

  // Already used by the three adoption stages.
  'Warehouse',
  'Share2',

  // Already used by the compliance panel and its badges.
  'Award',
  'BadgeCheck',
  'FileCheck',
  'FileText',
  'Link2',

  // Near neighbours, for stages and badges not yet written.
  'Boxes',
  'Building2',
  'Check',
  'CircleCheck',
  'Factory',
  'GitBranch',
  'Globe',
  'Layers',
  'MapPin',
  'Network',
  'Package',
  'Route',
  'Settings',
  'ShieldCheck',
  'ShoppingCart',
  'Sparkles',
  'Store',
  'Target',
  'TrendingUp',
  'Truck',
  'UserRound',
  'Users',
  'Workflow',
] as const;

export type SfaIconName = (typeof SFA_ICON_NAMES)[number];

export const isSfaIconName = (value: string): value is SfaIconName =>
  (SFA_ICON_NAMES as readonly string[]).includes(value);
