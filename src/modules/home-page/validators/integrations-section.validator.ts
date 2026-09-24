// src/modules/home-page/validators/integrations-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import {
  CreateIntegrationsEntryInput,
  IntegrationsEntryFilters,
  ReorderIntegrationsEntriesInput,
  UpdateIntegrationsEntryInput,
} from '../types/integrations-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const LOGO_ALT_MAX = 160;

/**
 * An absolute http(s) URL, or a site-relative path like '/images/sap.webp'.
 *
 * Anything else is rejected rather than escaped: this value goes straight into
 * an `src` attribute on the public site, and the schemes worth blocking there
 * (`javascript:`, `data:`) are exactly the ones a validator can enumerate away.
 */
function validateImageUrl(v: Validator, field: string, value: string): void {
  if (value.startsWith('/')) {
    v.custom(
      !value.startsWith('//'),
      field,
      `${field} must not be protocol-relative; give a full https:// URL instead`,
      'INVALID_IMAGE_URL',
    );
    return;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  v.custom(
    parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:'),
    field,
    `${field} must be an https:// URL or a site-relative path starting with '/'`,
    'INVALID_IMAGE_URL',
  );
}

export function validateCreateIntegrationsEntry(body: unknown): CreateIntegrationsEntryInput {
  const v = validator(body);

  const logoUrl = v.optionalString('logoUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (logoUrl) validateImageUrl(v, 'logoUrl', logoUrl);

  const logoFileId = v.optionalUuid('logoFileId') ?? null;

  // Mirrors home_integrations_entries_single_logo_source_check.
  v.custom(
    logoUrl === null || logoFileId === null,
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  // Mirrors home_integrations_entries_logo_required_check. An entry is one
  // badge on the sphere, so one without a logo cannot appear on the site.
  v.custom(
    logoUrl !== null || logoFileId !== null,
    'logoFileId',
    'An entry needs a logo: upload one or give a logo URL',
    'REQUIRED',
  );

  const centreLogoUrl = v.optionalString('centreLogoUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (centreLogoUrl) validateImageUrl(v, 'centreLogoUrl', centreLogoUrl);

  const centreLogoFileId = v.optionalUuid('centreLogoFileId') ?? null;

  // Mirrors home_integrations_entries_single_centre_source_check. Unlike the
  // orbit logo, neither is required - the site falls back to its own mark.
  v.custom(
    centreLogoUrl === null || centreLogoFileId === null,
    'centreLogoUrl',
    'Provide either centreLogoUrl or centreLogoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateIntegrationsEntryInput = {
    centreLogoUrl,
    centreLogoFileId,
    logoUrl,
    logoFileId,
    logoAlt: v.requiredString('logoAlt', { min: 1, max: LOGO_ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateIntegrationsEntry(body: unknown): UpdateIntegrationsEntryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'centreLogoUrl',
    'centreLogoFileId',
    'logoUrl',
    'logoFileId',
    'logoAlt',
    'displayOrder',
    'status',
  ]);

  // `null` clears the field; `undefined` (absent) leaves it alone. optionalString
  // conflates the two, so the presence check has to be explicit.
  const logoUrl = v.has('logoUrl')
    ? (v.optionalString('logoUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (logoUrl) validateImageUrl(v, 'logoUrl', logoUrl);

  const logoFileId = v.has('logoFileId') ? (v.optionalUuid('logoFileId') ?? null) : undefined;

  v.custom(
    !(logoUrl && logoFileId),
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  /*
   * Clearing both at once would leave the entry with no logo, which the CHECK
   * constraint rejects. Clearing one while the other is already stored is fine
   * and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(logoUrl === null && logoFileId === null),
    'logoFileId',
    'An entry needs a logo: upload one or give a logo URL',
    'REQUIRED',
  );

  const centreLogoUrl = v.has('centreLogoUrl')
    ? (v.optionalString('centreLogoUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (centreLogoUrl) validateImageUrl(v, 'centreLogoUrl', centreLogoUrl);

  const centreLogoFileId = v.has('centreLogoFileId')
    ? (v.optionalUuid('centreLogoFileId') ?? null)
    : undefined;

  v.custom(
    !(centreLogoUrl && centreLogoFileId),
    'centreLogoUrl',
    'Provide either centreLogoUrl or centreLogoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateIntegrationsEntryInput = {
    centreLogoUrl,
    centreLogoFileId,
    logoUrl,
    logoFileId,
    logoAlt: v.optionalString('logoAlt', { min: 1, max: LOGO_ALT_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateIntegrationsEntryStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move entry X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderIntegrationsEntries(
  body: unknown,
): ReorderIntegrationsEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_INTEGRATIONS_ENTRIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one entry id', 'REQUIRED');

  // uuidArray dedupes silently, which would turn a duplicated id into a
  // partial reorder. Compare against the raw length to catch it.
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

export function validateIntegrationsEntryListQuery(query: Record<string, unknown>): {
  filters: IntegrationsEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: IntegrationsEntryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
