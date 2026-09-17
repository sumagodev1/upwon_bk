export interface AdminSession {
  id: string;
  adminId: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
  createdAt: Date;
}

export interface CreateSessionInput {
  adminId: string;
  refreshTokenHash: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}

export interface PasswordResetToken {
  id: string;
  adminId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface DeviceInfo {
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}
