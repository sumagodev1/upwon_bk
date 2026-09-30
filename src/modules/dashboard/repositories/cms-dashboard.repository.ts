// src/modules/dashboard/repositories/cms-dashboard.repository.ts

import { runQuery } from '../../../config/database';
import {
  CMS_DASHBOARD_CONTENT_SQL,
  CMS_DASHBOARD_INBOXES_SQL,
  CMS_DASHBOARD_MY_ACTIVITY_SQL,
  CMS_DASHBOARD_SERIES_SQL,
} from '../../../database/queries/cms-dashboard.queries';
import { ContentCounter, DailyPoint, InboxCounter } from '../types/cms-dashboard.types';
import { RecentActivityItem } from '../types/dashboard.types';

/**
 * Counts for the CMS dashboard.
 *
 * Every figure is a COUNT over a table this installation has. Nothing is
 * estimated, and nothing is invented to fill a card.
 */

/** COUNT is bigint; the driver may hand it back as a string. */
const toInt = (value: unknown): number => Number(value ?? 0);

interface InboxRow {
  contact_total: string;
  contact_7d: string;
  careers_total: string;
  careers_7d: string;
  careers_new: string;
  partner_total: string;
  partner_7d: string;
  discovery_total: string;
  discovery_7d: string;
  audit_total: string;
  audit_7d: string;
}

/**
 * The five forms the public site submits into, in the order the panel draws
 * them: the two that are plainly sales enquiries first, then the three that
 * belong to a particular page.
 */
export const getInboxes = async (): Promise<InboxCounter[]> => {
  const result = await runQuery<InboxRow>(undefined, CMS_DASHBOARD_INBOXES_SQL, []);
  const row = result.rows[0];

  return [
    {
      key: 'contactEnquiries',
      label: 'Contact enquiries',
      to: '/cms/contact/enquiries',
      total: toInt(row.contact_total),
      last7Days: toInt(row.contact_7d),
      // No status column on this table, so nothing can be said about what is
      // still waiting - null, not zero.
      needsAttention: null,
    },
    {
      key: 'freeAuditApplications',
      label: 'Free audit requests',
      to: '/cms/resources/free-audit',
      total: toInt(row.audit_total),
      last7Days: toInt(row.audit_7d),
      needsAttention: null,
    },
    {
      key: 'careerApplications',
      label: 'Job applications',
      to: '/cms/careers',
      total: toInt(row.careers_total),
      last7Days: toInt(row.careers_7d),
      // The one inbox that tracks a status, so the one that can answer this.
      needsAttention: toInt(row.careers_new),
    },
    {
      key: 'partnerApplications',
      label: 'Partner applications',
      to: '/cms/partner-program',
      total: toInt(row.partner_total),
      last7Days: toInt(row.partner_7d),
      needsAttention: null,
    },
    {
      key: 'discoveryCalls',
      label: 'Discovery calls',
      to: '/cms/about',
      total: toInt(row.discovery_total),
      last7Days: toInt(row.discovery_7d),
      needsAttention: null,
    },
  ];
};

interface ContentRow {
  blog_total: string;
  blog_published: string;
  kb_total: string;
  kb_published: string;
  vacancies_total: string;
  vacancies_published: string;
  cases_total: string;
  cases_published: string;
  testimonials_total: string;
  testimonials_published: string;
  issues_total: string;
  issues_published: string;
}

/** The content areas that are lists an editor adds to, rather than fixed sections. */
export const getContent = async (): Promise<ContentCounter[]> => {
  const result = await runQuery<ContentRow>(undefined, CMS_DASHBOARD_CONTENT_SQL, []);
  const row = result.rows[0];

  return [
    {
      key: 'blogPosts',
      label: 'Blog posts',
      to: '/cms/resources/blog',
      total: toInt(row.blog_total),
      published: toInt(row.blog_published),
    },
    {
      key: 'kbArticles',
      label: 'Knowledgebase guides',
      to: '/cms/resources/knowledgebase',
      total: toInt(row.kb_total),
      published: toInt(row.kb_published),
    },
    {
      key: 'caseStudies',
      label: 'Client case studies',
      to: '/cms/clients',
      total: toInt(row.cases_total),
      published: toInt(row.cases_published),
    },
    {
      key: 'testimonials',
      label: 'Client testimonials',
      to: '/cms/clients',
      total: toInt(row.testimonials_total),
      published: toInt(row.testimonials_published),
    },
    {
      key: 'vacancies',
      label: 'Open roles',
      to: '/cms/careers',
      total: toInt(row.vacancies_total),
      published: toInt(row.vacancies_published),
    },
    {
      key: 'insiderIssues',
      label: 'Insider issues',
      to: '/cms/insider',
      total: toInt(row.issues_total),
      published: toInt(row.issues_published),
    },
  ];
};

/**
 * The daily series behind the two charts.
 *
 * The date axis is complete - the query fills quiet days with 0 - so the
 * client can plot straight from this without checking for gaps.
 */
export const getSeries = async (days: number): Promise<DailyPoint[]> => {
  const result = await runQuery<{ day: string; edits: number; submissions: number }>(
    undefined,
    CMS_DASHBOARD_SERIES_SQL,
    [days],
  );

  return result.rows.map((row) => ({
    day: row.day,
    edits: toInt(row.edits),
    submissions: toInt(row.submissions),
  }));
};

/** The signed-in admin's own last few changes. */
export const getMyRecentActivity = async (
  adminId: string,
  limit: number,
): Promise<RecentActivityItem[]> => {
  const result = await runQuery<{
    id: number;
    action: string;
    module: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: Date;
    admin_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>(undefined, CMS_DASHBOARD_MY_ACTIVITY_SQL, [adminId, limit]);

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    module: row.module,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at.toISOString(),
    actor: {
      id: row.admin_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    },
  }));
};
