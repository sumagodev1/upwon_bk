import { AuthenticatedAdmin, RequestContext } from './common.types';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: bigint;
      admin?: AuthenticatedAdmin;
      context?: RequestContext;
      apiKeyId?: string;
    }
  }
}

export {};
