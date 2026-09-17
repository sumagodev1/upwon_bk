import { Response } from 'express';
import { PaginationMeta } from './pagination';

interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
  requestId: string;
}

interface ErrorBody {
  success: false;
  message: string;
  error: { code: string; details?: unknown };
  requestId: string;
}

function requestIdOf(res: Response): string {
  return res.req?.requestId ?? 'unknown';
}

export const ApiResponse = {
  success<T>(res: Response, data: T, message = 'Request successful', status = 200): Response {
    const body: SuccessBody<T> = {
      success: true,
      message,
      data,
      requestId: requestIdOf(res),
    };
    return res.status(status).json(body);
  },

  created<T>(res: Response, data: T, message = 'Resource created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  },

  paginated<T>(
    res: Response,
    rows: T[],
    meta: PaginationMeta,
    message = 'Data retrieved successfully',
  ): Response {
    const body: SuccessBody<T[]> = {
      success: true,
      message,
      data: rows,
      meta,
      requestId: requestIdOf(res),
    };
    return res.status(200).json(body);
  },

  noContent(res: Response): Response {
    return res.status(204).send();
  },

  error(
    res: Response,
    message: string,
    code: string,
    status: number,
    details?: unknown,
  ): Response {
    const body: ErrorBody = {
      success: false,
      message,
      error: { code, ...(details !== undefined ? { details } : {}) },
      requestId: requestIdOf(res),
    };
    return res.status(status).json(body);
  },
};
