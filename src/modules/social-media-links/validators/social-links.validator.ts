// src/modules/social-media-links/validators/social-links.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  CreateSocialLinkInput,
  ReorderSocialLinksInput,
  SocialLinkFilters,
  UpdateSocialLinkInput,
} from '../types/social-links.types';
import { isAbsoluteHttpUrl, readSocialMediaIcon } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones
 * 048_social_media_links.sql sizes its columns to. Changing one means changing
 * all three.
 *
 * There is no label here, on create or on update: the button's name is the
 * platform its icon stands for, which the service writes from
 * SOCIAL_LINK_LABELS (utils/icons.ts). A label a client still sends is ignored
 * like any other unknown key.
 */
const URL_MAX = 500;

/**
 * A profile on another site, as a full address.
 *
 * Only the absolute form: a social link always leaves the site, so neither a
 * site-relative path nor a bare host ('linkedin.com/company/upwon') is one of
 * its shapes - the WEBSITE contact line is the one place a bare host is taken.
 * The site re-checks the same prefix before it renders the button.
 */
function validateSocialUrl(v: Validator, field: string, value: string): void {
  if (!value) return;

  v.custom(
    isAbsoluteHttpUrl(value),
    field,
    `${field} must be a full https:// address, such as https://www.linkedin.com/company/upwon`,
    'INVALID_URL',
  );
}

export function validateCreateSocialLink(body: unknown): CreateSocialLinkInput {
  const v = validator(body);

  const url = v.requiredString('url', { max: URL_MAX });
  validateSocialUrl(v, 'url', url);

  const dto: CreateSocialLinkInput = {
    icon: readSocialMediaIcon(v, true) as string,
    url,
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A partial edit of one link.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows, which rewrite the whole set at once.
 */
export function validateUpdateSocialLink(body: unknown): UpdateSocialLinkInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'url', 'status']);

  const url = v.has('url') ? v.requiredString('url', { max: URL_MAX }) : undefined;
  if (url !== undefined) validateSocialUrl(v, 'url', url);

  const dto: UpdateSocialLinkInput = {
    icon: readSocialMediaIcon(v, false),
    url,
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateSocialLinkStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every link's id, in its new order - a whole-set rewrite. */
export function validateReorderSocialLinks(body: unknown): ReorderSocialLinksInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_SOCIAL_LINKS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one social link id', 'REQUIRED');

  // uuidArray dedupes silently; a duplicated id would become a partial reorder
  // with two rows fighting over one position.
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

/** The admin list: a search box and a status filter, no paging. */
export function validateSocialLinkListQuery(query: Record<string, unknown>): SocialLinkFilters {
  const v = validator(query);
  const filters: SocialLinkFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
