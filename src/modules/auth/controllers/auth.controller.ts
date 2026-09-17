// src/modules/auth/controllers/auth.controller.ts

import { CookieOptions, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { IssuedTokens } from '../services/auth.service';
import {
  validateChangePassword,
  validateForgotPassword,
  validateLogin,
  validateRefresh,
  validateResetPassword,
} from '../validators/auth.validator';
import { DeviceInfo } from '../types/auth.types';
import { env } from '../../../config/env';
import { AuthenticationError } from '../../../core/errors/AuthenticationError';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Path is scoped to the auth routes so the cookie is not attached to every API
 * call - it is only needed by /refresh and /logout.
 *
 * SameSite=Strict plus the X-Requested-With check on /refresh is the CSRF
 * defence; there is no separate CSRF token.
 */
const refreshCookieOptions = (expiresAt: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: `${env.apiPrefix}/auth`,
  expires: expiresAt,
});

const readDevice = (req: Request): DeviceInfo => ({
  // The client may override via body.deviceName.
  deviceName: null,
  userAgent: req.get('user-agent')?.slice(0, 1000) ?? null,
  ipAddress: req.ip ?? null,
});

const setRefreshCookie = (res: Response, tokens: IssuedTokens): void => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    tokens.refreshToken,
    refreshCookieOptions(tokens.refreshExpiresAt),
  );
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: `${env.apiPrefix}/auth` });
};

const readRefreshCookie = (req: Request): string | undefined => {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_COOKIE_NAME];
};

// Admin login
export const loginController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateLogin(req.body);
  const { result, tokens } = await authService.login(
    dto,
    readDevice(req),
    buildContext(req),
  );
  setRefreshCookie(res, tokens);
  return ApiResponse.success(res, result, 'Signed in successfully');
};

// Rotate the refresh token and issue a new access token
export const refreshTokenController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateRefresh(req.body);
  // Cookie first; body is the fallback for non-browser clients.
  const rawToken = readRefreshCookie(req) ?? dto.refreshToken;
  if (!rawToken) {
    throw new AuthenticationError('Refresh token not provided', 'REFRESH_TOKEN_MISSING');
  }

  const tokens = await authService.refresh(rawToken, readDevice(req), buildContext(req));
  setRefreshCookie(res, tokens);

  return ApiResponse.success(
    res,
    { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, tokenType: 'Bearer' },
    'Token refreshed successfully',
  );
};

// Sign out of the current device
export const logoutController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  await authService.logout(
    readRefreshCookie(req),
    req.admin?.sessionId,
    buildContext(req),
  );
  clearRefreshCookie(res);
  return ApiResponse.success(res, null, 'Signed out successfully');
};

// Sign out of every device
export const logoutAllDevicesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const result = await authService.logoutAllDevices(req.admin!.id, buildContext(req));
  clearRefreshCookie(res);
  return ApiResponse.success(res, result, 'Signed out from all devices');
};

// Request a password reset link
export const forgotPasswordController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateForgotPassword(req.body);
  await authService.forgotPassword(dto.email, buildContext(req));
  // 202 unconditionally - the response must not reveal whether the account exists.
  return ApiResponse.success(
    res,
    null,
    'If an account exists for that email, a reset link has been sent',
    202,
  );
};

// Complete a password reset
export const resetPasswordController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateResetPassword(req.body);
  await authService.resetPassword(dto, buildContext(req));
  clearRefreshCookie(res);
  return ApiResponse.success(res, null, 'Password reset successfully. Please sign in.');
};

// Change your own password
export const changePasswordController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateChangePassword(req.body);
  const result = await authService.changePassword(
    req.admin!.id,
    req.admin!.sessionId,
    dto,
    buildContext(req),
  );
  return ApiResponse.success(res, result, 'Password changed successfully');
};

// Current admin profile, roles and permissions
export const getProfileController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const admin = req.admin!;
  return ApiResponse.success(
    res,
    {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      fullName: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      status: admin.status,
      roles: admin.roles,
      permissions: [...admin.permissions].sort(),
    },
    'Profile retrieved successfully',
  );
};

// List this admin's active devices
export const listSessionsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const sessions = await authService.listSessions(req.admin!.id, req.admin!.sessionId);
  return ApiResponse.success(res, sessions, 'Sessions retrieved successfully');
};

// Revoke one of this admin's own sessions
export const revokeSessionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const sessionId = validateUuidParam(req.params.id);
  await authService.revokeSession(req.admin!.id, sessionId, buildContext(req));
  return ApiResponse.noContent(res);
};
