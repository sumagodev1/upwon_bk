// src/modules/industry-pages/engineering-manufacturing-page/services/platform-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import { getStorageProvider } from '../../../../storage/storage.factory';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/platform-section.repository';
import {
  CreateEngineeringPlatformWorkflowInput,
  EngineeringPlatformPanel,
  EngineeringPlatformWorkflow,
  EngineeringPlatformWorkflowFilters,
  PublicEngineeringPlatformSection,
  ResolvedEngineeringPlatformPanel,
  UpdateEngineeringPlatformWorkflowInput,
  UpsertEngineeringPlatformPanelInput,
} from '../types/platform-section.types';

const MODULE = 'engineering_manufacturing_page';
const PANEL_ENTITY = 'engineering_platform_panel';
const WORKFLOW_ENTITY = 'engineering_platform_workflow';

/** Only images belong in the centre column; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

// ── the centre panel ──────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the site keeps its own illustration rather
  // than the request failing for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedPanel = async (
  panel: EngineeringPlatformPanel,
): Promise<ResolvedEngineeringPlatformPanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/**
 * Rejects a file id that is not a live image of the right shape.
 *
 * The illustration sits in a fixed-ratio column between the copy and the list,
 * so a differently shaped upload would push the list up or down - which is why
 * the ratio rule applies here.
 */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Illustration must be an image', [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }

  const buffer = await getStorageProvider().getFile(file.storageKey);
  const dimensions = readImageDimensions(buffer);
  if (!dimensions) {
    throw new ValidationError('Image could not be read', [
      {
        field,
        message: `${file.originalName} is not a readable PNG, JPEG, GIF or WebP image`,
        code: 'UNREADABLE_IMAGE',
      },
    ]);
  }

  const problem = checkImageDimensions('engineeringPlatform', dimensions);
  if (problem) {
    throw new ValidationError('Illustration is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedEngineeringPlatformPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertEngineeringPlatformPanelInput,
  context: RequestContext,
): Promise<ResolvedEngineeringPlatformPanel> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_PLATFORM_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { listLabel: existing.listLabel } : undefined,
        newValues: { listLabel: saved.listLabel },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};

// ── the workflows ─────────────────────────────────────────────────────────

export const listWorkflows = async (
  filters: EngineeringPlatformWorkflowFilters,
  pagination: PaginationParams,
): Promise<{ rows: EngineeringPlatformWorkflow[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllWorkflows(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getWorkflowById = async (id: string): Promise<EngineeringPlatformWorkflow> => {
  const workflow = await repo.findWorkflowById(id);
  if (!workflow) throw new NotFoundError('Workflow');
  return workflow;
};

export const createWorkflow = async (
  input: CreateEngineeringPlatformWorkflowInput,
  context: RequestContext,
): Promise<EngineeringPlatformWorkflow> =>
  withTransaction(async (client) => {
    const existing = await repo.countWorkflows(client);
    if (existing >= LIMITS.MAX_ENGINEERING_PLATFORM_WORKFLOWS) {
      throw new ConflictError(
        `The list holds at most ${LIMITS.MAX_ENGINEERING_PLATFORM_WORKFLOWS} workflows. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextWorkflowOrder(client));
    const created = await repo.createWorkflow({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_PLATFORM_WORKFLOW_CREATED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateWorkflow = async (
  id: string,
  patch: UpdateEngineeringPlatformWorkflowInput,
  context: RequestContext,
): Promise<EngineeringPlatformWorkflow> =>
  withTransaction(async (client) => {
    const existing = await repo.findWorkflowByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Workflow');

    const updated = await repo.updateWorkflow(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Workflow');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_PLATFORM_WORKFLOW_UPDATED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setWorkflowStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<EngineeringPlatformWorkflow> => updateWorkflow(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderWorkflows = async (
  ids: string[],
  context: RequestContext,
): Promise<EngineeringPlatformWorkflow[]> =>
  withTransaction(async (client) => {
    const total = await repo.countWorkflows(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every workflow', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingWorkflowIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a workflow that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyWorkflowOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_PLATFORM_WORKFLOWS_REORDERED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllWorkflows(
      {},
      { page: 1, limit: LIMITS.MAX_ENGINEERING_PLATFORM_WORKFLOWS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeWorkflow = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findWorkflowByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Workflow');

    await repo.removeWorkflow(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_PLATFORM_WORKFLOW_DELETED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
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
 * The whole section in one call: the copy, the centre panel and the workflows.
 *
 * Null when the copy is missing or no workflow is active - the page then keeps
 * the section it ships. A missing panel is fine: the site keeps its own
 * illustration and label.
 */
export const getPublished = async (): Promise<PublicEngineeringPlatformSection | null> => {
  const [copy, panel, workflows] = await Promise.all([
    sectionCopyService.get('engineering-manufacturing', 'platform'),
    repo.findPanel(),
    repo.findPublishedWorkflows(),
  ]);
  if (!copy || workflows.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    image: resolvedPanel?.image ?? null,
    imageAlt: resolvedPanel?.imageAlt ?? null,
    // An authored panel with the label turned off is '' - distinct from no
    // panel at all, where the site keeps its own label.
    listLabel: resolvedPanel ? (resolvedPanel.listLabel ?? '') : null,
    workflows: workflows.map((workflow) => ({
      label: workflow.label,
      icon: workflow.icon,
      accentColor: workflow.accentColor,
      tintColor: workflow.tintColor,
    })),
  };
};
