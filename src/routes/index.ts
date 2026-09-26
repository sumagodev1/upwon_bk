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
import fileRoutes, { publicFileRouter } from '../modules/files/routes/file.routes';
import homePageRoutes, { publicHomePageRouter } from '../modules/home-page/routes';
import erpPageRoutes, { publicErpPageRouter } from '../modules/product-pages/erp-page/routes';
import sfaDmsPageRoutes, {
  publicSfaDmsPageRouter,
} from '../modules/product-pages/sfa-dms-page/routes';
import fmsPageRoutes, { publicFmsPageRouter } from '../modules/product-pages/fms-page/routes';
import posPageRoutes, { publicPosPageRouter } from '../modules/product-pages/pos-page/routes';
import insiderPageRoutes, { publicInsiderPageRouter } from '../modules/insider-page/routes';
import contactPageRoutes, { publicContactPageRouter } from '../modules/contact-page/routes';
import careersRoutes, { publicCareersRouter } from '../modules/careers/routes';
import partnerProgramRoutes, {
  publicPartnerProgramRouter,
} from '../modules/partner-program/routes';
import aboutPageRoutes, { publicAboutPageRouter } from '../modules/about-page/routes';
import socialMediaLinksRoutes, {
  publicSocialMediaLinksRouter,
} from '../modules/social-media-links/routes';
import blogRoutes, { publicBlogRouter } from '../modules/blog/routes';

const router = Router();

// Public: /auth handles its own per-route rate limiting and authentication.
router.use('/auth', authRoutes);

// Public: read-only, already-published CMS content for the marketing site, which
// is an anonymous browser client and so cannot hold a token or an API key. Each
// section's public router is read-only and returns a narrowed shape - see
// modules/home-page/routes/hero-section.routes.ts.
router.use('/public/home-page', publicHomePageRouter);
router.use('/public/erp-page', publicErpPageRouter);
router.use('/public/sfa-dms-page', publicSfaDmsPageRouter);
router.use('/public/fms-page', publicFmsPageRouter);
router.use('/public/pos-page', publicPosPageRouter);
router.use('/public/insider-page', publicInsiderPageRouter);
router.use('/public/contact-page', publicContactPageRouter);
router.use('/public/careers', publicCareersRouter);
router.use('/public/partner-program', publicPartnerProgramRouter);
router.use('/public/about-page', publicAboutPageRouter);
// The site footer's contact lines and social icons - one GET for both lists,
// on every page. See modules/social-media-links/routes/index.ts.
router.use('/public/social-media-links', publicSocialMediaLinksRouter);
// The /blog page: its hero, its topics intro, and the chips and posts - plus
// one article per slug. See modules/blog/routes/index.ts.
router.use('/public/blog', publicBlogRouter);

// Public: the images those sections reference. Serves only uploads that opted
// in by entity type - see PUBLIC_FILE_ENTITY_TYPES and fileService.getPublicImage.
router.use('/public/files', publicFileRouter);

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
router.use('/home-page', homePageRoutes);
router.use('/erp-page', erpPageRoutes);
router.use('/sfa-dms-page', sfaDmsPageRoutes);
router.use('/fms-page', fmsPageRoutes);
router.use('/pos-page', posPageRoutes);
router.use('/insider-page', insiderPageRoutes);
router.use('/contact-page', contactPageRoutes);
router.use('/careers', careersRoutes);
router.use('/partner-program', partnerProgramRoutes);
router.use('/about-page', aboutPageRoutes);
router.use('/social-media-links', socialMediaLinksRoutes);
router.use('/blog', blogRoutes);

export default router;
