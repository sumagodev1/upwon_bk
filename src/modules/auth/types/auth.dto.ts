import { AdminSession } from './auth.types';

// ── inbound ──────────────────────────────────────────────────────────────
export interface LoginDto {
  email: string;
  password: string;
  deviceName?: string;
}

export interface RefreshDto {
  refreshToken?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ── outbound ─────────────────────────────────────────────────────────────
// The refresh token is absent from every outbound DTO. It travels only in the
// Set-Cookie header, written by the controller.

export interface AuthenticatedAdminDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
  lastLoginAt: string | null;
}

export interface LoginResultDto {
  accessToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
  admin: AuthenticatedAdminDto;
}

export interface SessionDto {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export function toSessionDto(session: AdminSession, currentSessionId?: string): SessionDto {
  return {
    id: session.id,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: session.id === currentSessionId,
  };
}
