// src/modules/industry-pages/non-food-fmcg-page/utils/icons.ts

import { ERP_ICON_NAMES } from '../../../product-pages/erp-page/utils/icons';

/**
 * The icons a benefit or an industry-coverage category may use, by name.
 *
 * The ERP page's allowlist plus the ones this page's two icon grids draw that
 * it lacks. Extended rather than copied, so a name added there is offered here
 * too. The site maps the same names back to lucide components
 * (src/lib/nonFoodFmcgIcons.js) - keep the two in step.
 */
export const NON_FOOD_FMCG_ICON_NAMES = [
  ...ERP_ICON_NAMES,
  // The benefits grid.
  'PackageSearch',
  'ClipboardList',
  'Warehouse',
  'MapPin',
  'Globe',
  'Monitor',
  // The industry-coverage categories.
  'Home',
  'Brush',
  'Droplet',
  'Scissors',
  'SprayCan',
  'WashingMachine',
  'Baby',
  'HeartPulse',
  'Layers',
  'ShoppingBasket',
] as const;

export type NonFoodFmcgIconName = (typeof NON_FOOD_FMCG_ICON_NAMES)[number];

export const isNonFoodFmcgIconName = (value: string): value is NonFoodFmcgIconName =>
  (NON_FOOD_FMCG_ICON_NAMES as readonly string[]).includes(value);
