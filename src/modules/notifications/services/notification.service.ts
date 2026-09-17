// src/modules/notifications/services/notification.service.ts

import { Executor } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { env } from '../../../config/env';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { logger } from '../../../core/utils/logger';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as notificationRepository from '../repositories/notification.repository';
import {
  CreateNotificationInput,
  Notification,
  NotificationFilters,
} from '../types/notification.types';

/**
 * Outbound email transport.
 *
 * No provider is wired up. sendEmail prints the message so the password reset
 * flow is usable in development; a production deployment MUST replace this
 * with a real transport (SES, SendGrid, SMTP) before the reset flow is
 * functional for real users.
 */
const sendEmail = async (message: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> => {
  if (env.isProduction) {
    // Refuse to silently swallow mail in production - a reset link that goes
    // nowhere is worse than a loud failure.
    logger.error('No email transport configured - message NOT delivered', {
      to: message.to,
      subject: message.subject,
    });
    return;
  }
  logger.info('[email:console] outbound message', {
    to: message.to,
    subject: message.subject,
    // Printed only outside production; the body contains the reset token.
    text: message.text,
  });
};

export const listForAdmin = async (
  adminId: string,
  filters: NotificationFilters,
  pagination: PaginationParams,
): Promise<{ rows: Notification[]; meta: PaginationMeta; unreadCount: number }> => {
  const [{ rows, total }, unreadCount] = await Promise.all([
    notificationRepository.findAllForAdmin(adminId, filters, pagination),
    notificationRepository.countUnread(adminId),
  ]);
  return { rows, meta: buildPaginationMeta(total, pagination), unreadCount };
};

export const create = async (
  input: CreateNotificationInput,
  context: RequestContext,
): Promise<{ created: number }> => {
  let created: number;
  if (input.adminId) {
    await notificationRepository.create(input);
    created = 1;
  } else {
    created = await notificationRepository.broadcast(input);
  }

  await auditLogService.record(
    {
      action: AUDIT_ACTIONS.NOTIFICATION_CREATED,
      module: 'notifications',
      entityType: 'notification',
      newValues: {
        type: input.type,
        title: input.title,
        targetAdminId: input.adminId,
        recipients: created,
      },
    },
    context,
  );

  return { created };
};

export const markRead = async (id: string, adminId: string): Promise<void> => {
  const notification = await notificationRepository.findById(id);
  if (!notification) throw new NotFoundError('Notification');
  // An admin may only mark their own notifications read. 404 rather than 403
  // avoids confirming that someone else's notification exists.
  if (notification.adminId !== adminId) throw new NotFoundError('Notification');
  await notificationRepository.markRead(id, adminId);
};

export const markAllRead = async (adminId: string): Promise<{ updated: number }> => {
  const updated = await notificationRepository.markAllRead(adminId);
  return { updated };
};

// ── queued side effects ────────────────────────────────────────────────────
// Called with `void` from other services, deliberately outside their
// transactions: an email provider timeout must not roll back a committed change.
//
// FUTURE: replace these with rows in a job_queue table enqueued INSIDE the
// business transaction, so work is never lost if the process dies here.

export const queuePasswordResetEmail = async (
  email: string,
  rawToken: string,
  expiresAt: Date,
): Promise<void> => {
  try {
    const minutes = Math.round((expiresAt.getTime() - Date.now()) / 60_000);
    await sendEmail({
      to: email,
      subject: 'Reset your Upwon admin password',
      text:
        `A password reset was requested for this account.\n\n` +
        `Reset token: ${rawToken}\n\n` +
        `This link expires in ${minutes} minutes. ` +
        `If you did not request this, no action is required.`,
    });
  } catch (error) {
    logger.error('Password reset email failed', { message: (error as Error).message });
  }
};

export const queueSecurityAlert = async (
  adminId: string,
  alert: { title: string; body: string },
  executor?: Executor,
): Promise<void> => {
  try {
    await notificationRepository.create(
      {
        adminId,
        type: 'SECURITY',
        title: alert.title,
        body: alert.body,
        metadata: { severity: 'high' },
      },
      executor,
    );
  } catch (error) {
    logger.error('Security alert notification failed', {
      adminId,
      message: (error as Error).message,
    });
  }
};
