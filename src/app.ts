import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { AuthorizationError } from './core/errors/AuthorizationError';
import { errorHandler } from './core/middleware/error.middleware';
import { notFoundHandler } from './core/middleware/not-found.middleware';
import { globalRateLimit } from './core/middleware/rate-limit.middleware';
import { requestId } from './core/middleware/request-id.middleware';
import { requestLogger } from './core/middleware/request-logger.middleware';
import apiRouter from './routes';
import { healthRoutes } from './routes/health.routes';

export const app: Application = express();

// Required for correct req.ip behind a load balancer. Without it every request
// appears to come from the LB and per-IP rate limiting becomes global.
if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // No browser-rendered content is served, so CSP has nothing to protect.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server calls send no Origin header - allow them; they are
      // still gated by the auth middleware.
      if (!origin || env.corsOrigin.includes(origin)) return callback(null, true);
      callback(new AuthorizationError('Origin not allowed', 'ORIGIN_NOT_ALLOWED'));
    },
    // Required for the refresh-token cookie.
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Requested-With',
      'X-API-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Order matters: requestId first so the logger and the error handler both
// have it available.
app.use(requestId);
app.use(requestLogger);

// Health probes bypass rate limiting - a throttled probe means a false outage.
app.use('/health', healthRoutes);

app.use(globalRateLimit);
app.use(env.apiPrefix, apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
