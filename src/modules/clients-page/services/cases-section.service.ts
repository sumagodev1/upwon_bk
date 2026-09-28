// src/modules/clients-page/services/cases-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../home-page/services/section-copy.service';
import * as repo from '../repositories/cases-section.repository';
import * as rowsRepo from '../repositories/story-rows.repository';
import {
  CHALLENGES_KIND,
  DELIVERABLES_KIND,
  OUTCOMES_KIND,
  TIMELINE_KIND,
} from '../utils/story-row-kinds';
import {
  CaseSectionKey,
  ClientsCaseCard,
  ClientsCaseCardFilters,
  CreateClientsCaseCardInput,
  PublicClientsCaseStory,
  PublicClientsCasesSection,
  UpdateClientsCaseCardInput,
} from '../types/cases-section.types';

const MODULE = 'clients_page';
const ENTITY = 'clients_case_card';

/** The card's three-column foot; the story shows every outcome. */
const CARD_OUTCOMES = 3;

/**
 * Refuses a slug another card already owns, as a field error rather than the
 * unique index's raw violation.
 */
const assertSlugFree = async (
  slug: string | null | undefined,
  exceptId: string | null,
  executor: Parameters<typeof repo.isSlugTaken>[2],
): Promise<void> => {
  if (!slug) return;
  if (await repo.isSlugTaken(slug, exceptId, executor)) {
    throw new ValidationError('That story URL is already used', [
      {
        field: 'slug',
        message: `Another case study already lives at /clients/${slug}`,
        code: 'SLUG_TAKEN',
      },
    ]);
  }
};

/** The fields an audit entry records, so every write snapshots the same set. */
const auditSnapshot = (card: ClientsCaseCard): Record<string, unknown> => ({
  category: card.category,
  brand: card.brand,
  location: card.location,
  scale: card.scale,
  headline: card.headline,
  storyUrl: card.storyUrl,
  slug: card.slug,
  duration: card.duration,
  challengeOneLine: card.challengeOneLine,
  challengeSummary: card.challengeSummary,
  whyUpwon: card.whyUpwon,
  sections: card.sections,
  testimonialQuote: card.testimonialQuote,
  testimonialAuthor: card.testimonialAuthor,
  testimonialRole: card.testimonialRole,
  displayOrder: card.displayOrder,
  status: card.status,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: ClientsCaseCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: ClientsCaseCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ClientsCaseCard> => {
  const card = await repo.findById(id);
  if (!card) throw new NotFoundError('Case card');
  return card;
};

/**
 * The website-facing read: the copy and every active card in one response.
 *
 * Null when the copy or the cards are missing - the page then keeps the
 * section it ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicClientsCasesSection | null> => {
  const [copy, cards] = await Promise.all([
    sectionCopyService.get('clients', 'outcomes'),
    repo.findPublished(),
  ]);
  if (!copy || cards.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext,
    cards: cards.map((card) => ({
      category: card.category,
      brand: card.brand,
      location: card.location,
      scale: card.scale,
      headline: card.headline,
      outcomes: card.outcomes.slice(0, CARD_OUTCOMES),
      storyUrl: card.storyUrl,
      slug: card.slug,
    })),
  };
};

/**
 * The website-facing story at /clients/<slug>: an ACTIVE card with that slug,
 * or a 404 - the site then falls back to its own copy of the story, if it has
 * one, and to /clients if not.
 */
export const getPublishedStory = async (slug: string): Promise<PublicClientsCaseStory> => {
  const card = await repo.findPublishedBySlug(slug);
  if (!card || !card.slug) throw new NotFoundError('Case study');

  const on = (section: CaseSectionKey) => card.sections[section] === 'ACTIVE';

  // Only the ACTIVE rows of the switched-on sections; a switched-off section
  // comes back empty, and the page hides empty sections.
  const activeRows = (kind: typeof OUTCOMES_KIND, section: CaseSectionKey) =>
    on(section) ? rowsRepo.findByCase(kind, card.id, { status: 'ACTIVE' }) : Promise.resolve([]);

  const [outcomes, challenges, timeline, deliverables] = await Promise.all([
    activeRows(OUTCOMES_KIND, 'outcomes'),
    activeRows(CHALLENGES_KIND, 'challenges'),
    activeRows(TIMELINE_KIND, 'timeline'),
    activeRows(DELIVERABLES_KIND, 'deliverables'),
  ]);

  const hasTestimonial =
    on('testimonial') &&
    Boolean(card.testimonialQuote && card.testimonialAuthor && card.testimonialRole);

  return {
    slug: card.slug,
    category: card.category,
    brand: card.brand,
    location: card.location,
    scale: card.scale,
    headline: card.headline,
    duration: card.duration,
    challengeOneLine: card.challengeOneLine,
    // The summary belongs to the challenge section, so it goes when that does.
    challengeSummary: on('challenges') ? card.challengeSummary : null,
    outcomes: outcomes.map((r) => ({ value: r.values.value, label: r.values.label })),
    challenges: challenges.map((r) => ({ title: r.values.title, desc: r.values.desc })),
    whyUpwon: on('whyUpwon') ? card.whyUpwon : null,
    timeline: timeline.map((r) => ({
      week: r.values.week,
      title: r.values.title,
      detail: r.values.detail,
    })),
    deliverables: deliverables.map((r) => r.values.text),
    testimonial: hasTestimonial
      ? {
          quote: card.testimonialQuote as string,
          author: card.testimonialAuthor as string,
          role: card.testimonialRole as string,
        }
      : null,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateClientsCaseCardInput,
  context: RequestContext,
): Promise<ClientsCaseCard> =>
  withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_CLIENTS_CASE_CARDS) {
      throw new ConflictError(
        `The Clients page holds at most ${LIMITS.MAX_CLIENTS_CASE_CARDS} case cards. Delete or deactivate one first.`,
        'CASE_CARD_LIMIT_REACHED',
      );
    }

    await assertSlugFree(input.slug, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_CARD_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateClientsCaseCardInput,
  context: RequestContext,
): Promise<ClientsCaseCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Case card');

    await assertSlugFree(patch.slug, id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Case card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_CARD_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

/** Publish / unpublish, separate from update() so the audit trail tells them apart. */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ClientsCaseCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Case card');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await repo.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Case card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_CARD_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

/**
 * Takes the complete id list in its new order. A list that omits or invents
 * rows is rejected rather than half-applied.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ClientsCaseCard[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);
    if (ids.length !== total) {
      throw new ValidationError('The order must list every card', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a card that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_CARDS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_CLIENTS_CASE_CARDS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

/** Switches one story section on or off, leaving its content untouched. */
export const setSectionStatus = async (
  id: string,
  section: CaseSectionKey,
  status: ContentStatus,
  context: RequestContext,
): Promise<ClientsCaseCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Case card');

    if (existing.sections[section] === status) return existing;

    const updated = await repo.updateSectionStatus(id, section, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Case card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_SECTION_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { section, status: existing.sections[section] },
        newValues: { section, status },
      },
      context,
      client,
    );

    return updated;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Case card');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_CARD_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        // The full row, so deleted copy is recoverable from the audit trail.
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
