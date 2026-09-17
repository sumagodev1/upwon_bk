import { NotificationType } from '../../../config/constants';

export interface Notification {
  id: string;
  adminId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  /** null broadcasts to every admin. */
  adminId: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  type?: NotificationType;
  unreadOnly?: boolean;
}
