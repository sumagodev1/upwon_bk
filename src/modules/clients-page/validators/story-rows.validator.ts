// src/modules/clients-page/validators/story-rows.validator.ts

import { CONTENT_STATUSES, ContentStatus } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import {
  CreateStoryRowInput,
  StoryRowKind,
  UpdateStoryRowInput,
} from '../types/story-rows.types';

/**
 * One validator for every story list, driven by the kind's fields: each is
 * required text up to its column's size, named in the body by field.key.
 */

export function validateCreateStoryRow(kind: StoryRowKind, body: unknown): CreateStoryRowInput {
  const v = validator(body);

  const values: Record<string, string> = {};
  for (const field of kind.fields) {
    values[field.key] = v.requiredString(field.key, { min: 1, max: field.max });
  }

  const dto: CreateStoryRowInput = {
    values,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateStoryRow(kind: StoryRowKind, body: unknown): UpdateStoryRowInput {
  const v = validator(body);

  v.requireAtLeastOne([...kind.fields.map((f) => f.key), 'displayOrder', 'status']);

  const values: Partial<Record<string, string>> = {};
  for (const field of kind.fields) {
    if (v.has(field.key)) {
      values[field.key] = v.requiredString(field.key, { min: 1, max: field.max });
    }
  }

  const dto: UpdateStoryRowInput = {
    values,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Shared by a row's toggle and a whole section's toggle. */
export function validateStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** The complete id list for one case's section, in its new order. */
export function validateStoryRowReorder(kind: StoryRowKind, body: unknown): { ids: string[] } {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: kind.maxRows });

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
