// src/routes/index.ts

import { Router } from 'express';
import { authenticate } from '../core/middleware/auth.middleware';
import authRoutes from '../modules/auth/routes/auth.routes';
import adminRoutes from '../modules/admins/routes/admin.routes';
import roleRoutes from '../modules/roles/routes/role.routes';
import permissionRoutes from '../modules/permissions/routes/permission.routes';
import organizationRoutes from '../modules/organizations/routes/organization.routes';
import planRoutes from '../modules/plans/routes/plan.routes';
import subscriptionRoutes from '../modules/subscriptions/routes/subscription.routes';
import dashboardRoutes from '../modules/dashboard/routes/dashboard.routes';
import auditLogRoutes from '../modules/audit-logs/routes/audit-log.routes';
import settingRoutes from '../modules/settings/routes/setting.routes';
import notificationRoutes from '../modules/notifications/routes/notification.routes';
import apiKeyRoutes from '../modules/api-keys/routes/api-key.routes';
import fileRoutes from '../modules/files/routes/file.routes';

const router = Router();

// Public: /auth handles its own per-route rate limiting and authentication.
router.use('/auth', authRoutes);

// Everything past this line requires a valid access token and an ACTIVE admin.
// Mounting authenticate here rather than per-module makes it impossible to add
// a new module and forget it.
router.use(authenticate);

router.use('/admins', adminRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/organizations', organizationRoutes);
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/settings', settingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/files', fileRoutes);

export default router;
