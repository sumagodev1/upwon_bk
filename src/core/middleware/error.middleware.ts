import { ErrorRequestHandler } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';
import { ValidationError } from '../errors/ValidationError';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';

/**
 * Terminal error handler.
 *
 * The 4-argument signature is required for Express to recognise this as an
 * error handler - do NOT remove `next`, even though it is only used on the
 * headers-sent path, and do not let a linter delete it.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // If headers are already sent, the response is committed. Delegating to
  // Express's default handler is the only correct action - it destroys the
  // socket rather than attempting a second write.
  if (res.headersSent) {
    return next(error);
  }

  const baseMeta = {
    requestId: req.requestId,
    adminId: req.admin?.id ?? null,
    method: req.method,
    path: req.originalUrl.split('?')[0],
  };

  if (error instanceof AppError) {
    if (error.isOperational) {
      logger.warn('Handled application error', {
        ...baseMeta,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
    } else {
      // Non-operational AppError (e.g. DatabaseError): the details carry the
      // SQLSTATE and query. Logged here, never serialized to the client.
      logger.error('Non-operational application error', {
        ...baseMeta,
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack,
      });
    }

    const clientDetails =
      error instanceof ValidationError
        ? error.fields
        : error.isOperational
          ? error.details
          : undefined;

    return ApiResponse.error(
      res,
      error.isOperational ? error.message : 'An unexpected error occurred',
      error.code,
      error.statusCode,
      env.isProduction ? clientDetails : (clientDetails ?? { stack: error.stack }),
    );
  }

  // Malformed JSON from express.json()
  if (error instanceof SyntaxError && 'body' in error) {
    logger.warn('Malformed request body', baseMeta);
    return ApiResponse.error(res, 'Malformed JSON in request body', 'MALFORMED_JSON', 400);
  }

  // Unknown - a programmer error. Log everything, reveal nothing.
  const unknownError = error as Error;
  logger.error('Unhandled error', {
    ...baseMeta,
    name: unknownError?.name,
    message: unknownError?.message,
    stack: unknownError?.stack,
  });

  return ApiResponse.error(
    res,
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    500,
    env.isProduction
      ? undefined
      : { message: unknownError?.message, stack: unknownError?.stack },
  );
};
