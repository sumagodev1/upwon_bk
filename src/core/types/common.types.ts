export interface AuthenticatedAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  permissions: Set<string>;
  hasFullAccess: boolean;
  sessionId?: string;
}

/** Passed explicitly from controller -> service. No global request state. */
export interface RequestContext {
  requestId: string;
  adminId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  roles: string[];
  permissions: Set<string>;
  hasFullAccess: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
}

export interface DateRangeFilter {
  createdFrom?: Date;
  createdTo?: Date;
}
