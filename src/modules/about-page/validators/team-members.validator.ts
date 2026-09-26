// src/modules/about-page/validators/team-members.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  AboutTeamMemberFilters,
  CreateAboutTeamMemberInput,
  ReorderAboutTeamMembersInput,
  UpdateAboutTeamMemberInput,
} from '../types/team.types';
import { readImagePair } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones 025_about_page_team.sql
 * sizes its columns to. Changing one means changing all three.
 */
const NAME_MIN = 2;
const NAME_MAX = 120;
const ROLE_MIN = 2;
const ROLE_MAX = 160;
/** One line under the role ('Nashik · Platform · Architecture · Scale'). */
const META_MIN = 2;
const META_MAX = 160;

export function validateCreateAboutTeamMember(body: unknown): CreateAboutTeamMemberInput {
  const v = validator(body);

  const photo = readImagePair(v, 'photoUrl', 'photoFileId');

  const dto: CreateAboutTeamMemberInput = {
    name: v.requiredString('name', { min: NAME_MIN, max: NAME_MAX }),
    role: v.requiredString('role', { min: ROLE_MIN, max: ROLE_MAX }),
    meta: v.requiredString('meta', { min: META_MIN, max: META_MAX }),
    photoUrl: photo.url,
    photoFileId: photo.fileId,
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * The photo pair on an edit, read only when the client sent either half.
 *
 * Absent means "leave the photograph alone"; present-and-blank means "remove
 * it". Both halves are then written together, because the table's
 * single_photo_source CHECK is about the pair rather than either column - a
 * patch that set photoUrl without clearing photoFileId would be refused by the
 * database with no field named.
 */
function readPhotoPatch(
  v: Validator,
  body: unknown,
): { photoUrl?: string | null; photoFileId?: string | null } {
  const raw = body as Record<string, unknown> | null;
  const sent = raw?.photoUrl !== undefined || raw?.photoFileId !== undefined;
  if (!sent) return {};

  const photo = readImagePair(v, 'photoUrl', 'photoFileId');
  return { photoUrl: photo.url, photoFileId: photo.fileId };
}

/**
 * A full edit of one person.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows, which rewrite the whole set at once. A typed position
 * lets two people claim 3 and leaves the tie to created_at, which is not what
 * the person typing it meant.
 */
export function validateUpdateAboutTeamMember(body: unknown): UpdateAboutTeamMemberInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'role', 'meta', 'photoUrl', 'photoFileId', 'status']);

  const dto: UpdateAboutTeamMemberInput = {
    name: v.optionalString('name', { min: NAME_MIN, max: NAME_MAX }),
    role: v.optionalString('role', { min: ROLE_MIN, max: ROLE_MAX }),
    meta: v.optionalString('meta', { min: META_MIN, max: META_MAX }),
    ...readPhotoPatch(v, body),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateAboutTeamMemberStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every person's id, in their new order - a whole-set rewrite. */
export function validateReorderAboutTeamMembers(
  body: unknown,
): ReorderAboutTeamMembersInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ABOUT_TEAM_MEMBERS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one person id', 'REQUIRED');

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
export function validateAboutTeamMemberListQuery(
  query: Record<string, unknown>,
): AboutTeamMemberFilters {
  const v = validator(query);
  const filters: AboutTeamMemberFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
