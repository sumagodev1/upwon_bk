import { RequestHandler } from 'express';
import { logger } from '../utils/logger';

const SKIP_PATHS = new Set(['/health', '/health/live', '/health/ready']);

export const requestLogger: RequestHandler = (req, res, next) => {
  if (SKIP_PATHS.has(req.path)) return next();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - req.startTime) / 1_000_000;

    const meta = {
      requestId: req.requestId,
      // Read at finish-time: authenticate() has run by now, so this is populated
      // even though this middleware was registered before it.
      adminId: req.admin?.id ?? null,
      method: req.method,
      // req.route?.path keeps cardinality low (/admins/:id, not /admins/<uuid>).
      route: req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    };

    if (res.statusCode >= 500) logger.error('Request failed', meta);
    else if (res.statusCode >= 400) logger.warn('Request rejected', meta);
    else logger.info('Request completed', meta);
  });

  next();
};
