export interface AuditLogActor {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
  actor: AuditLogActor;
}

export interface AuditInsertPayload {
  adminId: string | null;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface AuditLogFilters {
  adminId?: string;
  action?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
