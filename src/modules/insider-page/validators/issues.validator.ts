// src/modules/insider-page/validators/issues.validator.ts

import { CONTENT_STATUSES } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import {
  CreateInsiderIssueInput,
  InsiderIssueFilters,
  UpdateInsiderIssueInput,
} from '../types/issues.types';
import { readSlug } from '../utils/slug';

const LABEL_MAX = 120;
/** Monthly: four digits is several centuries of issues. */
const ISSUE_NUMBER_MAX = 9999;

export function validateCreateInsiderIssue(body: unknown): CreateInsiderIssueInput {
  const v = validator(body);

  const label = v.requiredString('label', { min: 2, max: LABEL_MAX });

  const dto: CreateInsiderIssueInput = {
    // 'March 2026' -> 'march-2026' when the caller leaves the slug blank.
    slug: readSlug(v, label),
    label,
    // Absent means "the next one", worked out by the repository's INSERT: the
    // number is printed beside the label on the site but is not authored.
    issueNumber: v.optionalNumber('issueNumber', {
      min: 1,
      max: ISSUE_NUMBER_MAX,
      integer: true,
    }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
    isCurrent: v.optionalBoolean('isCurrent') ?? false,
  };

  v.assert();
  return dto;
}

/**
 * A merge, like the hero update: absent leaves a field, null clears summary.
 * isCurrent: true makes this the one current issue (demoting the previous one);
 * false only clears this issue's flag, leaving the site to fall back to the
 * newest published issue.
 */
export function validateUpdateInsiderIssue(body: unknown): UpdateInsiderIssueInput {
  const v = validator(body);

  v.requireAtLeastOne(['slug', 'label', 'issueNumber', 'status', 'isCurrent']);

  const dto: UpdateInsiderIssueInput = {
    slug: v.has('slug') ? v.slug('slug') : undefined,
    label: v.optionalString('label', { min: 2, max: LABEL_MAX }),
    issueNumber: v.optionalNumber('issueNumber', {
      min: 1,
      max: ISSUE_NUMBER_MAX,
      integer: true,
    }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
    isCurrent: v.optionalBoolean('isCurrent'),
  };

  v.assert();
  return dto;
}

export function validateInsiderIssueStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

export function validateInsiderIssueListQuery(
  query: Record<string, unknown>,
): InsiderIssueFilters & { search?: string } {
  const v = validator(query);
  const filters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.nullableString('search', { max: 120 }) ?? undefined,
  };
  v.assert();
  return filters;
}
