// src/modules/blog/utils/icons.ts

/**
 * The icons an administrator may pick for a blog category chip, by name.
 *
 * The site draws these as React components - something a database cannot
 * hold. So a category stores the name and the site maps it back to a
 * component through a lookup of exactly these keys (the website's
 * src/lib/blogIcons.js).
 *
 * Every name is a lucide-react 0.460 export, which both front ends ship, and
 * each was checked against the installed package in both of them. The first
 * six are the ones data/blog.js draws today (Factory, Truck, Store, UserCog,
 * PackageCheck, TrendingUp); the rest are the near neighbours a food & FMCG
 * blog is likely to file its next topic under - a commodity, a channel, a
 * function, or a kind of read.
 *
 * An allowlist rather than "any lucide name" for two reasons: an unknown name
 * would render a blank chip on the live page, and lucide ships well over a
 * thousand icons, which is a picker nobody can use.
 *
 * Adding one means adding it here, to the admin panel's mirror of this list,
 * and to the website's lookup. All three are keyed by the same names, so a
 * name that exists in one and not the others fails loudly rather than
 * silently. The order is the order the picker offers them in.
 */
export const BLOG_CATEGORY_ICON_NAMES = [
  // The six the blog ships with, in its own order.
  'Factory',
  'Truck',
  'Store',
  'UserCog',
  'PackageCheck',
  'TrendingUp',

  // Operations and channels.
  'Boxes',
  'ShoppingCart',
  'Warehouse',

  // Food categories.
  'Wheat',
  'Milk',
  'Cake',
  'Coffee',
  'Leaf',

  // Functions.
  'BarChart3',
  'ShieldCheck',
  'Users',
  'Settings',

  // Kinds of read.
  'Lightbulb',
  'BookOpen',
  'Newspaper',
  'Sparkles',
  'Globe',
  'Cpu',
] as const;

export type BlogCategoryIconName = (typeof BLOG_CATEGORY_ICON_NAMES)[number];

export const isBlogCategoryIconName = (value: string): value is BlogCategoryIconName =>
  (BLOG_CATEGORY_ICON_NAMES as readonly string[]).includes(value);
