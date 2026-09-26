// src/modules/clients-page/types/network-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * "From Sambhajinagar to Kolkata." - the operational network band on the
 * Clients page: counters, state cards and an India map with a pin per city.
 *
 * The counters and the pins are derived on the site from these rows. The
 * eyebrow, heading and subtext live once in page_section_copy under
 * ('clients', 'network').
 */

export const NETWORK_ZONES = ['North', 'South', 'East', 'West', 'Central', 'North-East'] as const;

export type NetworkZone = (typeof NETWORK_ZONES)[number];

/** One city: a pin on the map and a name on its state's card. */
export interface ClientsNetworkCity {
  name: string;
  /** Degrees north. */
  lat: number;
  /** Degrees east. */
  lng: number;
}

export interface ClientsNetworkState {
  id: string;
  state: string;
  zone: NetworkZone;
  /** At least one, in order. */
  cities: ClientsNetworkCity[];
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientsNetworkStateInput {
  state: string;
  zone: NetworkZone;
  cities: ClientsNetworkCity[];
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateClientsNetworkStateInput = Partial<CreateClientsNetworkStateInput>;

export interface ClientsNetworkStateFilters {
  status?: ContentStatus;
}

export interface ReorderClientsNetworkStatesInput {
  ids: string[];
}

/** The website-facing shape: the section copy and its states, in one read. */
export interface PublicClientsNetworkSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string | null;
  states: Array<{ state: string; zone: NetworkZone; cities: ClientsNetworkCity[] }>;
}
