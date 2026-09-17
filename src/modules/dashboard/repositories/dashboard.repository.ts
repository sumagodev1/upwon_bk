// src/modules/dashboard/repositories/dashboard.repository.ts

import { runQuery } from '../../../config/database';
import {
  DASHBOARD_GROWTH_SQL,
  DASHBOARD_OVERVIEW_SQL,
  DASHBOARD_PLAN_DISTRIBUTION_SQL,
  DASHBOARD_RECENT_ACTIVITY_SQL,
} from '../../../database/queries/dashboard.queries';
import {
  GrowthPoint,
  OverviewCounters,
  PlanDistributionItem,
  RecentActivityItem,
} from '../types/dashboard.types';

interface OverviewRow {
  total_admins: number;
  active_admins: number;
  inactive_admins: number;
  suspended_admins: number;
  admins_active_last_7d: number;
  total_organizations: number;
  active_organizations: number;
  inactive_organizations: number;
  suspended_organizations: number;
  organizations_this_month: number;
  total_subscriptions: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  cancelled_subscriptions: number;
  expiring_subscriptions: number;
  total_plans: number;
  active_plans: number;
  mrr: string;
}

export const getOverviewCounters = async (
  expiryHorizonDays: number,
): Promise<OverviewCounters> => {
  const result = await runQuery<OverviewRow>(undefined, DASHBOARD_OVERVIEW_SQL, [
    expiryHorizonDays,
  ]);
  const row = result.rows[0];

  return {
    totalAdmins: Number(row.total_admins),
    activeAdmins: Number(row.active_admins),
    inactiveAdmins: Number(row.inactive_admins),
    suspendedAdmins: Number(row.suspended_admins),
    adminsActiveLast7d: Number(row.admins_active_last_7d),

    totalOrganizations: Number(row.total_organizations),
    activeOrganizations: Number(row.active_organizations),
    inactiveOrganizations: Number(row.inactive_organizations),
    suspendedOrganizations: Number(row.suspended_organizations),
    organizationsThisMonth: Number(row.organizations_this_month),

    totalSubscriptions: Number(row.total_subscriptions),
    activeSubscriptions: Number(row.active_subscriptions),
    trialingSubscriptions: Number(row.trialing_subscriptions),
    pastDueSubscriptions: Number(row.past_due_subscriptions),
    cancelledSubscriptions: Number(row.cancelled_subscriptions),
    expiringSubscriptions: Number(row.expiring_subscriptions),

    totalPlans: Number(row.total_plans),
    activePlans: Number(row.active_plans),

    mrr: row.mrr,
  };
};

export const getRecentActivity = async (limit: number): Promise<RecentActivityItem[]> => {
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
  }>(undefined, DASHBOARD_RECENT_ACTIVITY_SQL, [limit]);

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

export const getGrowthSeries = async (days: number): Promise<GrowthPoint[]> => {
  const result = await runQuery<{
    day: Date;
    organization_signups: number;
    new_subscriptions: number;
    cancellations: number;
  }>(undefined, DASHBOARD_GROWTH_SQL, [days]);

  return result.rows.map((row) => ({
    // DATE columns come back as a Date at UTC midnight; slice to the calendar
    // day so the client is not tempted to apply a timezone to it.
    day: row.day.toISOString().slice(0, 10),
    organizationSignups: Number(row.organization_signups),
    newSubscriptions: Number(row.new_subscriptions),
    cancellations: Number(row.cancellations),
  }));
};

export const getPlanDistribution = async (): Promise<PlanDistributionItem[]> => {
  const result = await runQuery<{
    id: string;
    name: string;
    code: string;
    price: string;
    currency: string;
    billing_interval: string;
    subscriber_count: number;
  }>(undefined, DASHBOARD_PLAN_DISTRIBUTION_SQL, []);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    price: row.price,
    currency: row.currency,
    billingInterval: row.billing_interval,
    subscriberCount: Number(row.subscriber_count),
  }));
};
