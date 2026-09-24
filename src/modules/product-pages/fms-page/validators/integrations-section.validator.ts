// src/modules/product-pages/fms-page/validators/integrations-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateFmsIntegrationLogoInput,
  FmsIntegrationLogoFilters,
  ReorderInput,
  UpdateFmsIntegrationLogoInput,
  UpsertFmsIntegrationSectionInput,
} from '../types/integrations-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const LOGO_ALT_MAX = 160;

/**
 * The centre mark.
 *
 * Nothing is required: a section with no centre mark is valid, and the site
 * falls back to the one it ships. So this accepts an empty body, which is how
 * an editor clears the override back to the default.
 */
export function validateUpsertFmsIntegrationSection(
  body: unknown,
): UpsertFmsIntegrationSectionInput {
  const v = validator(body);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const centreLogoUrl = v.has('centreLogoUrl')
    ? (v.optionalString('centreLogoUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (centreLogoUrl) validateMediaUrl(v, 'centreLogoUrl', centreLogoUrl);

  const centreLogoFileId = v.has('centreLogoFileId')
    ? (v.optionalUuid('centreLogoFileId') ?? null)
    : undefined;

  // Mirrors fms_integration_section_single_centre_source_check.
  v.custom(
    !(centreLogoUrl && centreLogoFileId),
    'centreLogoUrl',
    'Provide either centreLogoUrl or centreLogoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpsertFmsIntegrationSectionInput = { centreLogoUrl, centreLogoFileId };

  v.assert();
  return dto;
}

export function validateCreateFmsIntegrationLogo(
  body: unknown,
): CreateFmsIntegrationLogoInput {
  const v = validator(body);

  const logoUrl = v.optionalString('logoUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.optionalUuid('logoFileId') ?? null;

  // Mirrors fms_integration_logos_single_logo_source_check.
  v.custom(
    logoUrl === null || logoFileId === null,
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  /*
   * Mirrors fms_integration_logos_logo_required_check. A row contributes
   * nothing but its mark, so one without an image cannot appear on the sphere
   * at all.
   */
  v.custom(
    logoUrl !== null || logoFileId !== null,
    'logoFileId',
    'A logo needs an image: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: CreateFmsIntegrationLogoInput = {
    logoUrl,
    logoFileId,
    /*
     * Required, where some sections leave alt text optional: the mark carries
     * no text of its own, so this is the only thing a screen reader can read
     * in its place.
     */
    logoAlt: v.requiredString('logoAlt', { min: 1, max: LOGO_ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFmsIntegrationLogo(
  body: unknown,
): UpdateFmsIntegrationLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['logoUrl', 'logoFileId', 'logoAlt', 'displayOrder', 'status']);

  /*
   * `null` clears the field; `undefined` (absent) leaves it alone.
   * optionalString conflates the two, so the presence check has to be explicit.
   */
  const logoUrl = v.has('logoUrl')
    ? (v.optionalString('logoUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);

  const logoFileId = v.has('logoFileId') ? (v.optionalUuid('logoFileId') ?? null) : undefined;

  v.custom(
    !(logoUrl && logoFileId),
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  /*
   * Clearing both at once would leave the row with no mark, which the CHECK
   * constraint rejects. Clearing one while the other is already stored is fine
   * and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(logoUrl === null && logoFileId === null),
    'logoFileId',
    'A logo needs an image: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: UpdateFmsIntegrationLogoInput = {
    logoUrl,
    logoFileId,
    logoAlt: v.optionalString('logoAlt', { min: 1, max: LOGO_ALT_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFmsIntegrationStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateFmsIntegrationReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_FMS_INTEGRATION_LOGOS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

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

export function validateFmsIntegrationLogoListQuery(query: Record<string, unknown>): {
  filters: FmsIntegrationLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FmsIntegrationLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
