// src/modules/industry-pages/engineering-manufacturing-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { EngineeringIconName } from '../utils/icons';

/**
 * The core capabilities section: copy on the left, and on the right an artwork
 * with eight cards drawn into it that the site fills with one capability each.
 *
 * The card a capability lands in, and the number printed on it, follow display
 * order - so there is no number or position stored here. The icon and colours
 * are drawn only on the stacked cards phones and tablets get; on the artwork
 * the icons are part of the picture.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('engineering-manufacturing', 'capabilities').
 */

export interface EngineeringCapability {
  id: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: EngineeringIconName;
  /** The icon's colour, as #RRGGBB. */
  accentColor: string;
  /** The square behind the icon, as #RRGGBB. */
  tintColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEngineeringCapabilityInput {
  title: string;
  description: string;
  icon: EngineeringIconName;
  accentColor: string;
  tintColor: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringCapabilityInput = Partial<CreateEngineeringCapabilityInput>;

export interface EngineeringCapabilityFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderEngineeringCapabilitiesInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy and the capabilities, in order.
 *
 * Null when the copy is missing or nothing is active - the page then keeps the
 * section it ships.
 */
export interface PublicEngineeringCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  capabilities: Array<{
    title: string;
    description: string;
    icon: EngineeringIconName;
    accentColor: string;
    tintColor: string;
  }>;
}
