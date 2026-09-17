// src/modules/auth/validators/auth.validator.ts

import { validator } from '../../../core/utils/validation';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  ResetPasswordDto,
} from '../types/auth.dto';

export function validateLogin(body: unknown): LoginDto {
  const v = validator(body);
  const dto: LoginDto = {
    email: v.requiredEmail('email'),
    // NOT v.password(): the policy applies when SETTING a password. Applying it
    // at login leaks the policy to an attacker and rejects legacy passwords
    // before they can be verified.
    password: v.requiredString('password', { min: 1, max: 128 }),
    deviceName: v.optionalString('deviceName', { max: 120 }),
  };
  v.assert();
  return dto;
}

export function validateRefresh(body: unknown): RefreshDto {
  const v = validator(body);
  const dto: RefreshDto = {
    refreshToken: v.optionalString('refreshToken', { min: 20, max: 200 }),
  };
  v.assert();
  return dto;
}

export function validateForgotPassword(body: unknown): ForgotPasswordDto {
  const v = validator(body);
  const dto: ForgotPasswordDto = { email: v.requiredEmail('email') };
  v.assert();
  return dto;
}

export function validateResetPassword(body: unknown): ResetPasswordDto {
  const v = validator(body);
  const dto: ResetPasswordDto = {
    token: v.requiredString('token', { min: 20, max: 200 }),
    password: v.password('password'),
  };
  v.assert();
  return dto;
}

export function validateChangePassword(body: unknown): ChangePasswordDto {
  const v = validator(body);
  const dto: ChangePasswordDto = {
    currentPassword: v.requiredString('currentPassword', { min: 1, max: 128 }),
    newPassword: v.password('newPassword'),
  };
  v.custom(
    dto.currentPassword !== dto.newPassword,
    'newPassword',
    'New password must differ from the current password',
    'PASSWORD_UNCHANGED',
  );
  v.assert();
  return dto;
}
