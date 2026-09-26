// src/modules/product-pages/pos-page/services/security-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { parseHeading } from '../../../home-page/utils/heading-markup';
import {
  assertUsableImageFile,
  resolveImageSource,
} from '../../../home-page/utils/image-asset';
import * as repo from '../repositories/security-section.repository';
import {
  CreatePosSecurityAssuranceInput,
  CreatePosSecurityBadgeInput,
  CreatePosSecurityLogoInput,
  PosSecurityAssurance,
  PosSecurityBadge,
  PosSecurityListFilters,
  PosSecurityLogo,
  PosSecuritySection,
  PublicPosSecuritySection,
  ResolvedPosSecurityLogo,
  ResolvedPosSecuritySection,
  UpdatePosSecurityAssuranceInput,
  UpdatePosSecurityBadgeInput,
  UpdatePosSecurityLogoInput,
  UpsertPosSecuritySectionInput,
} from '../types/security-section.types';

const MODULE = 'pos_page';
const SECTION_ENTITY = 'pos_security_section';
const BADGE_ENTITY = 'pos_security_badge';
const LOGO_ENTITY = 'pos_security_logo';
const ASSURANCE_ENTITY = 'pos_security_assurance';

/*
 * The sphere's marks are checked against the home page's integrations slot:
 * the same partner artwork, drawn the same way - object-contain at a fixed
 * height - so the rule that fits one fits the other.
 */
const LOGO_SLOT = 'integrationsLogo' as const;
const SHIELD_SLOT = 'posSecurityShield' as const;
const ILLUSTRATION_SLOT = 'posSecurityIllustration' as const;

// ── the fixed furniture ───────────────────────────────────────────────────

const toResolvedSection = async (
  section: PosSecuritySection,
): Promise<ResolvedPosSecuritySection> => {
  const [shieldImage, dataLeftImage, dataRightImage] = await Promise.all([
    resolveImageSource(section.shieldImageUrl, section.shieldImageFileId),
    resolveImageSource(section.dataLeftImageUrl, section.dataLeftImageFileId),
    resolveImageSource(section.dataRightImageUrl, section.dataRightImageFileId),
  ]);
  return { ...section, shieldImage, dataLeftImage, dataRightImage };
};

/** Null before the band has ever been authored - a normal first-run state. */
export const getSection = async (): Promise<ResolvedPosSecuritySection | null> => {
  const section = await repo.findSection();
  return section ? toResolvedSection(section) : null;
};

export const saveSection = async (
  input: UpsertPosSecuritySectionInput,
  context: RequestContext,
): Promise<ResolvedPosSecuritySection> => {
  // Each upload is checked against the slot it is destined for, before the
  // transaction opens: a storage round trip does not belong inside one.
  if (input.shieldImageFileId) {
    await assertUsableImageFile(input.shieldImageFileId, SHIELD_SLOT, 'shieldImageFileId');
  }
  if (input.dataLeftImageFileId) {
    await assertUsableImageFile(
      input.dataLeftImageFileId,
      ILLUSTRATION_SLOT,
      'dataLeftImageFileId',
    );
  }
  if (input.dataRightImageFileId) {
    await assertUsableImageFile(
      input.dataRightImageFileId,
      ILLUSTRATION_SLOT,
      'dataRightImageFileId',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.findSection(client);
    const saved = await repo.upsertSection(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { dataHeading: existing.dataHeading } : undefined,
        newValues: { dataHeading: saved.dataHeading },
      },
      context,
      client,
    );

    return toResolvedSection(saved);
  });
};

// ── the compliance badges ─────────────────────────────────────────────────

export const listBadges = async (
  filters: PosSecurityListFilters,
  pagination: PaginationParams,
): Promise<{ rows: PosSecurityBadge[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllBadges(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getBadgeById = async (id: string): Promise<PosSecurityBadge> => {
  const badge = await repo.findBadgeById(id);
  if (!badge) throw new NotFoundError('Badge');
  return badge;
};

export const createBadge = async (
  input: CreatePosSecurityBadgeInput,
  context: RequestContext,
): Promise<PosSecurityBadge> =>
  withTransaction(async (client) => {
    const existing = await repo.countBadges(client);
    if (existing >= LIMITS.MAX_POS_SECURITY_BADGES) {
      throw new ConflictError(
        `The panel holds at most ${LIMITS.MAX_POS_SECURITY_BADGES} badges - they flank the shield in two columns`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextBadgeOrder(client));
    const created = await repo.createBadge({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_BADGE_CREATED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateBadge = async (
  id: string,
  patch: UpdatePosSecurityBadgeInput,
  context: RequestContext,
): Promise<PosSecurityBadge> =>
  withTransaction(async (client) => {
    const existing = await repo.findBadgeByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Badge');

    const updated = await repo.updateBadge(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Badge');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_BADGE_UPDATED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setBadgeStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<PosSecurityBadge> => updateBadge(id, { status }, context);

export const reorderBadges = async (
  ids: string[],
  context: RequestContext,
): Promise<PosSecurityBadge[]> =>
  withTransaction(async (client) => {
    const total = await repo.countBadges(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every badge', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingBadgeIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a badge that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyBadgeOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_BADGES_REORDERED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllBadges(
      {},
      { page: 1, limit: LIMITS.MAX_POS_SECURITY_BADGES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeBadge = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findBadgeByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Badge');

    await repo.removeBadge(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_BADGE_DELETED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the sphere's marks ────────────────────────────────────────────────────

const toResolvedLogo = async (logo: PosSecurityLogo): Promise<ResolvedPosSecurityLogo> => ({
  ...logo,
  image: await resolveImageSource(logo.imageUrl, logo.imageFileId),
});

export const listLogos = async (
  filters: PosSecurityListFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedPosSecurityLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedPosSecurityLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreatePosSecurityLogoInput,
  context: RequestContext,
): Promise<ResolvedPosSecurityLogo> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId, LOGO_SLOT, 'imageFileId');

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_POS_SECURITY_LOGOS) {
      throw new ConflictError(`The sphere holds at most ${LIMITS.MAX_POS_SECURITY_LOGOS} marks`);
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_LOGO_CREATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: created.id,
        newValues: { alt: created.alt, status: created.status },
      },
      context,
      client,
    );

    return toResolvedLogo(created);
  });
};

export const updateLogo = async (
  id: string,
  patch: UpdatePosSecurityLogoInput,
  context: RequestContext,
): Promise<ResolvedPosSecurityLogo> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId, LOGO_SLOT, 'imageFileId');

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_LOGO_UPDATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt, status: existing.status },
        newValues: { alt: updated.alt, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedLogo(updated);
  });
};

export const setLogoStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedPosSecurityLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedPosSecurityLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every mark', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingLogoIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a mark that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_POS_SECURITY_LOGOS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedLogo));
  });

export const removeLogo = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    await repo.removeLogo(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_LOGO_DELETED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt },
      },
      context,
      client,
    );
  });
};

// ── the assurances ────────────────────────────────────────────────────────

export const listAssurances = async (
  filters: PosSecurityListFilters,
  pagination: PaginationParams,
): Promise<{ rows: PosSecurityAssurance[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllAssurances(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getAssuranceById = async (id: string): Promise<PosSecurityAssurance> => {
  const assurance = await repo.findAssuranceById(id);
  if (!assurance) throw new NotFoundError('Assurance');
  return assurance;
};

export const createAssurance = async (
  input: CreatePosSecurityAssuranceInput,
  context: RequestContext,
): Promise<PosSecurityAssurance> =>
  withTransaction(async (client) => {
    const existing = await repo.countAssurances(client);
    if (existing >= LIMITS.MAX_POS_SECURITY_ASSURANCES) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_POS_SECURITY_ASSURANCES} assurances`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextAssuranceOrder(client));
    const created = await repo.createAssurance(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_ASSURANCE_CREATED,
        module: MODULE,
        entityType: ASSURANCE_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateAssurance = async (
  id: string,
  patch: UpdatePosSecurityAssuranceInput,
  context: RequestContext,
): Promise<PosSecurityAssurance> =>
  withTransaction(async (client) => {
    const existing = await repo.findAssuranceByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Assurance');

    const updated = await repo.updateAssurance(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Assurance');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_ASSURANCE_UPDATED,
        module: MODULE,
        entityType: ASSURANCE_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setAssuranceStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<PosSecurityAssurance> => updateAssurance(id, { status }, context);

export const reorderAssurances = async (
  ids: string[],
  context: RequestContext,
): Promise<PosSecurityAssurance[]> =>
  withTransaction(async (client) => {
    const total = await repo.countAssurances(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every assurance', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingAssuranceIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names an assurance that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyAssuranceOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_ASSURANCES_REORDERED,
        module: MODULE,
        entityType: ASSURANCE_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllAssurances(
      {},
      { page: 1, limit: LIMITS.MAX_POS_SECURITY_ASSURANCES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeAssurance = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findAssuranceByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Assurance');

    await repo.removeAssurance(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_SECURITY_ASSURANCE_DELETED,
        module: MODULE,
        entityType: ASSURANCE_ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole band in one call.
 *
 * Null when either the copy or the furniture is missing - the page then keeps
 * the band it ships. An empty list is not a reason to fall back: the section
 * has four independent parts, and one of them being empty means the component
 * draws fewer things rather than the wrong thing.
 *
 * A mark whose file has been deleted is dropped rather than published with a
 * null source, which would render a broken image on the sphere.
 */
export const getPublished = async (): Promise<PublicPosSecuritySection | null> => {
  const [copy, section, badges, logos, assurances] = await Promise.all([
    sectionCopyService.get('pos', 'establishers'),
    repo.findSection(),
    repo.findPublishedBadges(),
    repo.findPublishedLogos(),
    repo.findPublishedAssurances(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolvedSection(section);
  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter((logo): logo is ResolvedPosSecurityLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',

    panelOneLabel: resolved.panelOneLabel,
    panelTwoLabel: resolved.panelTwoLabel,
    shieldImage: resolved.shieldImage,

    sphereFootnote: resolved.sphereFootnote,
    sphereFootnoteLines: resolved.sphereFootnote
      ? parseHeading(resolved.sphereFootnote)
      : null,

    dataIcon: resolved.dataIcon,
    dataHeading: resolved.dataHeading,
    dataBody: resolved.dataBody,
    dataLeftImage: resolved.dataLeftImage,
    dataRightImage: resolved.dataRightImage,

    badges: badges.map((b) => ({ icon: b.icon, title: b.title, subtext: b.subtext })),
    logos: resolvedLogos,
    assurances: assurances.map((a) => ({ icon: a.icon, label: a.label })),
  };
};
