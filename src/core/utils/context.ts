import { Request } from 'express';
import { RequestContext } from '../types/common.types';

/** The one place a RequestContext is constructed from an Express request. */
export function buildContext(req: Request): RequestContext {
  return {
    requestId: req.requestId,
    adminId: req.admin?.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    roles: req.admin?.roles ?? [],
    permissions: req.admin?.permissions ?? new Set<string>(),
    hasFullAccess: req.admin?.hasFullAccess ?? false,
  };
}
