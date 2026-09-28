// src/modules/why-upwon-page/utils/icons.ts

/**
 * The icons an administrator may pick on this page, by name.
 *
 * The site draws these with lucide-react, which exports them as React
 * components - something a database cannot hold. So the record stores the name
 * and the site maps it back to a component through a lookup of exactly these
 * keys (src/lib/whyUpwonIcons.js on the website).
 *
 * Curated for what the page says about the platform - visibility, workflows,
 * insight, control - the same way each page keeps its own list. Adding one
 * means adding it here and to the site's lookup.
 */
export const WHY_UPWON_ICON_NAMES = [
  // Already used by the product proof callouts.
  'BarChart3',
  'Workflow',
  'Lightbulb',
  'Settings',

  // Already used by the proof & results cards.
  'FileCheck2',
  'Share2',

  // Near neighbours, for entries not yet written.
  'Activity',
  'Award',
  'BadgeCheck',
  'Bell',
  'Boxes',
  'Brain',
  'Building2',
  'ClipboardCheck',
  'Clock',
  'Cloud',
  'Database',
  'Eye',
  'Factory',
  'Gauge',
  'Globe',
  'Layers',
  'LayoutDashboard',
  'LineChart',
  'Lock',
  'Network',
  'PieChart',
  'Rocket',
  'ShieldCheck',
  'SlidersHorizontal',
  'Sparkles',
  'Target',
  'TrendingUp',
  'Users',
  'Zap',
] as const;

export type WhyUpwonIconName = (typeof WHY_UPWON_ICON_NAMES)[number];

export const isWhyUpwonIconName = (value: string): value is WhyUpwonIconName =>
  (WHY_UPWON_ICON_NAMES as readonly string[]).includes(value);
