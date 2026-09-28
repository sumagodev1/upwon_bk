// src/modules/clients-page/routes/story-rows.routes.ts

import { Request, Response, Router } from 'express';
import { CONTENT_STATUSES, ContentStatus, PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { asyncHandler } from '../../../core/utils/async-handler';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/story-rows.service';
import { StoryRow, StoryRowKind } from '../types/story-rows.types';
import {
  validateCreateStoryRow,
  validateStatusBody,
  validateStoryRowReorder,
  validateUpdateStoryRow,
} from '../validators/story-rows.validator';

/**
 * The admin routes for one story list section, registered on the case study
 * router at /clients-page/cases-section/:caseId/<kind.key> (see
 * cases-section.routes.ts). Registered with their full paths rather than
 * mounted as a sub-router: scripts/route-audit.js cannot decode a mount path
 * that carries a parameter, and an undecodable route fails the audit.
 *
 *   GET    /             every row of the case, in order (?status= to filter)
 *   POST   /             add a row
 *   PUT    /reorder      the complete id list in its new order
 *   GET    /:id          one row
 *   PUT    /:id          edit a row
 *   PUT    /:id/status   activate / deactivate a row
 *   DELETE /:id          delete a row
 *
 * Rows go out with their fields at the top level ({ id, value, label, ... }),
 * the shape the admin forms read and write.
 */

const toApi = (row: StoryRow) => ({
  id: row.id,
  caseId: row.caseId,
  ...row.values,
  displayOrder: row.displayOrder,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export function registerStoryRowRoutes(router: Router, kind: StoryRowKind): void {
  const read = requirePermission(PERMISSIONS.CLIENTS_PAGE_READ);
  const create = requirePermission(PERMISSIONS.CLIENTS_PAGE_CREATE);
  const update = requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE);
  const destroy = requirePermission(PERMISSIONS.CLIENTS_PAGE_DELETE);

  const caseIdOf = (req: Request) => validateUuidParam(req.params.caseId);
  const idOf = (req: Request) => validateUuidParam(req.params.id);
  const label = kind.noun.charAt(0).toUpperCase() + kind.noun.slice(1);
  const base = `/:caseId/${kind.key}`;

  router.get(
    base,
    read,
    asyncHandler(async (req: Request, res: Response) => {
      const raw = req.query.status;
      const status =
        typeof raw === 'string' && (CONTENT_STATUSES as readonly string[]).includes(raw)
          ? (raw as ContentStatus)
          : undefined;
      const rows = await service.list(kind, caseIdOf(req), status);
      return ApiResponse.success(res, rows.map(toApi), `${label}s retrieved successfully`);
    }),
  );

  router.post(
    base,
    create,
    asyncHandler(async (req: Request, res: Response) => {
      const dto = validateCreateStoryRow(kind, req.body);
      const row = await service.create(kind, caseIdOf(req), dto, buildContext(req));
      return ApiResponse.created(res, toApi(row), `${label} created successfully`);
    }),
  );

  // Declared before '/:id', or 'reorder' would be parsed as an id.
  router.put(
    `${base}/reorder`,
    update,
    asyncHandler(async (req: Request, res: Response) => {
      const { ids } = validateStoryRowReorder(kind, req.body);
      const rows = await service.reorder(kind, caseIdOf(req), ids, buildContext(req));
      return ApiResponse.success(res, rows.map(toApi), `${label}s reordered successfully`);
    }),
  );

  router.get(
    `${base}/:id`,
    read,
    asyncHandler(async (req: Request, res: Response) => {
      const row = await service.getById(kind, caseIdOf(req), idOf(req));
      return ApiResponse.success(res, toApi(row), `${label} retrieved successfully`);
    }),
  );

  router.put(
    `${base}/:id`,
    update,
    asyncHandler(async (req: Request, res: Response) => {
      const dto = validateUpdateStoryRow(kind, req.body);
      const row = await service.update(kind, caseIdOf(req), idOf(req), dto, buildContext(req));
      return ApiResponse.success(res, toApi(row), `${label} updated successfully`);
    }),
  );

  router.put(
    `${base}/:id/status`,
    update,
    asyncHandler(async (req: Request, res: Response) => {
      const { status } = validateStatusBody(req.body);
      const row = await service.setStatus(kind, caseIdOf(req), idOf(req), status, buildContext(req));
      return ApiResponse.success(
        res,
        toApi(row),
        status === 'ACTIVE' ? `${label} activated` : `${label} deactivated`,
      );
    }),
  );

  router.delete(
    `${base}/:id`,
    destroy,
    asyncHandler(async (req: Request, res: Response) => {
      await service.remove(kind, caseIdOf(req), idOf(req), buildContext(req));
      return ApiResponse.noContent(res);
    }),
  );
}
