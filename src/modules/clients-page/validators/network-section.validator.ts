// src/modules/clients-page/validators/network-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import {
  ClientsNetworkCity,
  ClientsNetworkStateFilters,
  CreateClientsNetworkStateInput,
  NETWORK_ZONES,
  ReorderClientsNetworkStatesInput,
  UpdateClientsNetworkStateInput,
} from '../types/network-section.types';

const STATE_MAX = 80;
const CITY_NAME_MAX = 80;

/**
 * The box a pin may land in: the site's India outline, with a little margin.
 * A coordinate outside it would draw a pin off the map - almost always a
 * swapped lat/lng pair, which is worth catching at write time.
 */
const LAT_RANGE = [6, 37.5] as const;
const LNG_RANGE = [68, 97.5] as const;

const readCoordinate = (
  v: Validator,
  field: string,
  raw: unknown,
  [min, max]: readonly [number, number],
  label: string,
): number | null => {
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    v.custom(false, field, `${label} must be a number`, 'INVALID_TYPE');
    return null;
  }
  if (value < min || value > max) {
    v.custom(false, field, `${label} must be between ${min} and ${max} (India)`, 'OUT_OF_RANGE');
    return null;
  }
  // Two decimals is ~1km, far finer than a pin on the map can show.
  return Math.round(value * 100) / 100;
};

/**
 * The state's cities, in order.
 *
 * Read off the raw body because the Validator has no helper for an array of
 * objects, and each error has to name its row ('cities[1].lat') so the admin
 * form can put it under the right input.
 */
function parseCities(v: Validator, body: unknown): ClientsNetworkCity[] {
  const raw = (body as { cities?: unknown } | null)?.cities;

  if (raw === undefined || raw === null) {
    v.custom(false, 'cities', 'Add at least one city', 'REQUIRED');
    return [];
  }
  if (!Array.isArray(raw)) {
    v.custom(false, 'cities', 'cities must be an array', 'INVALID_TYPE');
    return [];
  }

  const cities: ClientsNetworkCity[] = [];
  const seen = new Set<string>();

  raw.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      v.custom(false, `cities[${index}]`, 'Each city must be an object', 'INVALID_TYPE');
      return;
    }

    const { name, lat, lng } = entry as { name?: unknown; lat?: unknown; lng?: unknown };
    const nameText = typeof name === 'string' ? name.trim() : '';

    if (nameText === '') {
      v.custom(false, `cities[${index}].name`, 'City name is required', 'REQUIRED');
    } else if (nameText.length > CITY_NAME_MAX) {
      v.custom(
        false,
        `cities[${index}].name`,
        `City name must be at most ${CITY_NAME_MAX} characters`,
        'TOO_LONG',
      );
    } else if (seen.has(nameText.toLowerCase())) {
      v.custom(false, `cities[${index}].name`, 'This city is listed twice', 'DUPLICATE');
    }
    seen.add(nameText.toLowerCase());

    const latValue = readCoordinate(v, `cities[${index}].lat`, lat, LAT_RANGE, 'Latitude');
    const lngValue = readCoordinate(v, `cities[${index}].lng`, lng, LNG_RANGE, 'Longitude');

    if (nameText && latValue !== null && lngValue !== null) {
      cities.push({ name: nameText, lat: latValue, lng: lngValue });
    }
  });

  v.custom(raw.length > 0, 'cities', 'Add at least one city', 'REQUIRED');
  v.custom(
    raw.length <= LIMITS.MAX_CLIENTS_NETWORK_CITIES_PER_STATE,
    'cities',
    `A state lists at most ${LIMITS.MAX_CLIENTS_NETWORK_CITIES_PER_STATE} cities`,
    'TOO_MANY',
  );

  return cities;
}

export function validateCreateClientsNetworkState(body: unknown): CreateClientsNetworkStateInput {
  const v = validator(body);

  const dto: CreateClientsNetworkStateInput = {
    state: v.requiredString('state', { min: 2, max: STATE_MAX }),
    zone: v.requiredEnum('zone', NETWORK_ZONES),
    cities: parseCities(v, body),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateClientsNetworkState(body: unknown): UpdateClientsNetworkStateInput {
  const v = validator(body);

  v.requireAtLeastOne(['state', 'zone', 'cities', 'displayOrder', 'status']);

  const dto: UpdateClientsNetworkStateInput = {
    state: v.has('state') ? v.requiredString('state', { min: 2, max: STATE_MAX }) : undefined,
    zone: v.optionalEnum('zone', NETWORK_ZONES),
    cities: v.has('cities') ? parseCities(v, body) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateClientsNetworkStateStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** The complete id list in its new order - a whole-set rewrite. */
export function validateReorderClientsNetworkStates(
  body: unknown,
): ReorderClientsNetworkStatesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_CLIENTS_NETWORK_STATES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently; compare against the raw length to catch it.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}

export function validateClientsNetworkStateListQuery(query: Record<string, unknown>): {
  filters: ClientsNetworkStateFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ClientsNetworkStateFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
