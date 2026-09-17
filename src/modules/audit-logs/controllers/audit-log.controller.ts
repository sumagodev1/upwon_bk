// src/modules/audit-logs/controllers/audit-log.controller.ts

import { Request, Response } from 'express';
import * as auditLogService from '../services/audit-log.service';
import {
  validateAuditLogId,
  validateAuditLogQuery,
} from '../validators/audit-log.validator';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ApiResponse } from '../../../core/utils/ApiResponse';

export const listAuditLogsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateAuditLogQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await auditLogService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Audit logs retrieved successfully');
};

export const getAuditLogByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateAuditLogId(req.params.id);
  const entry = await auditLogService.getById(id);
  if (!entry) throw new NotFoundError('Audit log entry');
  return ApiResponse.success(res, entry, 'Audit log entry retrieved successfully');
};

export const listAuditActionsController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const actions = await auditLogService.listDistinctActions();
  return ApiResponse.success(res, actions, 'Audit actions retrieved successfully');
};
