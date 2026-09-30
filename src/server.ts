import http from 'node:http';
import { app } from './app';
import { checkDatabaseHealth, closePool } from './config/database';
import { env } from './config/env';
import { logger } from './core/utils/logger';
import { recaptchaEnabled } from './core/utils/recaptcha';

let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  // Fail fast: refuse to accept traffic if the database is unreachable at boot.
  const health = await checkDatabaseHealth();
  if (!health.healthy) {
    logger.error('Database unreachable at startup - aborting boot');
    process.exit(1);
  }
  logger.info('Database connection verified', { latencyMs: health.latencyMs });

  /*
   * Said out loud rather than left to be discovered. An unset secret leaves
   * the admin sign-in and the public contact form accepting submissions
   * nobody checked - fine on a laptop, not fine in production, and invisible
   * from the outside either way because both forms still work.
   */
  if (recaptchaEnabled()) {
    logger.info('reCAPTCHA verification is ON for admin login and public contact enquiries');
  } else {
    logger.warn('reCAPTCHA verification is OFF - RECAPTCHA_SECRET_KEY is not set');
  }

  const server = http.createServer(app);
  // Must exceed a typical ALB idle timeout, and headersTimeout must exceed
  // keepAliveTimeout, or the LB sees sporadic 502s from races on connection close.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  server.listen(env.port, () => {
    logger.info('Admin API listening', {
      port: env.port,
      env: env.nodeEnv,
      prefix: env.apiPrefix,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    // /health/ready now fails, so the load balancer drains this node while
    // in-flight requests are allowed to finish.
    app.set('shuttingDown', true);

    logger.info('Shutdown initiated', { signal });

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out - forcing exit');
      process.exit(1);
    }, env.shutdownGraceMs);
    forceExit.unref();

    server.close(() => {
      void (async () => {
        try {
          await closePool();
          logger.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { message: (error as Error).message });
          process.exit(1);
        }
      })();
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    void shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { message: error.message, stack: error.stack });
    void shutdown('uncaughtException');
  });
}

void bootstrap();
