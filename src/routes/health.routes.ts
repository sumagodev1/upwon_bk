import { Router } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { asyncHandler } from '../core/utils/async-handler';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'upwon-admin-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness: is the process alive?
 *
 * Deliberately does NOT touch the database - a liveness probe that fails on a
 * database blip triggers a restart loop that makes the outage worse.
 */
healthRoutes.get('/live', (_req, res) => {
  res.json({ status: 'alive', uptime: process.uptime() });
});

/**
 * Readiness: should this node receive traffic?
 *
 * Fails as soon as shutdown begins, so the load balancer drains this node
 * while in-flight requests finish.
 */
healthRoutes.get(
  '/ready',
  asyncHandler(async (req, res) => {
    if (req.app.get('shuttingDown')) {
      res.status(503).json({ status: 'draining' });
      return;
    }
    const database = await checkDatabaseHealth();
    res.status(database.healthy ? 200 : 503).json({
      status: database.healthy ? 'ready' : 'not_ready',
      database,
    });
  }),
);
