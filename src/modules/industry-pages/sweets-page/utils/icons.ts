// src/modules/industry-pages/sweets-page/utils/icons.ts

import { ERP_ICON_NAMES } from '../../../product-pages/erp-page/utils/icons';

/**
 * The icons a trust figure may use, by name.
 *
 * The ERP page's allowlist plus the two this page's figures draw that it lacks
 * - Candy and Building2. Extended rather than copied, so a name added there is
 * offered here too. The site maps the same names back to lucide components
 * (src/lib/sweetsIcons.js), so a name that exists here and not there fails
 * loudly in review rather than silently on the page.
 */
export const SWEETS_ICON_NAMES = [...ERP_ICON_NAMES, 'Candy', 'Building2'] as const;

export type SweetsIconName = (typeof SWEETS_ICON_NAMES)[number];

export const isSweetsIconName = (value: string): value is SweetsIconName =>
  (SWEETS_ICON_NAMES as readonly string[]).includes(value);
