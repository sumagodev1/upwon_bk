// src/modules/industry-pages/dairy-page/utils/icons.ts

import { ERP_ICON_NAMES } from '../../../product-pages/erp-page/utils/icons';

/**
 * The icons a capability card or a benefit may use, by name.
 *
 * The ERP page's allowlist plus the ones this page's two icon grids draw that
 * it lacks. Extended rather than copied, so a name added there is offered here
 * too. The site maps the same names back to lucide components
 * (src/lib/dairyIcons.js) - keep the two in step.
 */
export const DAIRY_ICON_NAMES = [
  ...ERP_ICON_NAMES,
  // The capability cards and the benefits grid.
  'Box',
  'Warehouse',
  'MapPin',
  'ClipboardList',
] as const;

export type DairyIconName = (typeof DAIRY_ICON_NAMES)[number];

export const isDairyIconName = (value: string): value is DairyIconName =>
  (DAIRY_ICON_NAMES as readonly string[]).includes(value);
