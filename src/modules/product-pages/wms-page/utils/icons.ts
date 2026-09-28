// src/modules/product-pages/wms-page/utils/icons.ts

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
 * networks, the POS page's for the counter, the HREasy page's for a
 * workforce, and this one for a warehouse - racks, batches, cold chain,
 * scanning, dispatch. A picker is only useful when it offers the handful of
 * icons that suit the section in front of you.
 *
 * Adding one means adding it here and to the site's lookup, which is checked
 * by the same names - so a name in one and not the other fails loudly.
 */
export const WMS_ICON_NAMES = [
  // Already used by the closing band's buttons and its trust strip.
  'CalendarDays',
  'Package',
  'ShieldCheck',
  'Lock',
  'Clock',

  // Drawn by the customer-outcomes cards.
  'PackageOpen',
  'Clock3',
  'ChartNoAxesCombined',

  // Near neighbours, for sections not yet written.
  'Barcode',
  'Boxes',
  'Building2',
  'ClipboardCheck',
  'ClipboardList',
  'Container',
  'Forklift',
  'Gauge',
  'Layers',
  'MapPin',
  'PackageCheck',
  'PackageSearch',
  'QrCode',
  'Refrigerator',
  'Route',
  'Ruler',
  'ScanLine',
  'Scale',
  'Snowflake',
  'Sparkles',
  'Target',
  'Thermometer',
  'Timer',
  'TrendingUp',
  'Truck',
  'Warehouse',
] as const;

export type WmsIconName = (typeof WMS_ICON_NAMES)[number];

export const isWmsIconName = (value: string): value is WmsIconName =>
  (WMS_ICON_NAMES as readonly string[]).includes(value);
