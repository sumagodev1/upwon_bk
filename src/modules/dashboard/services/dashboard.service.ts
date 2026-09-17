// src/modules/dashboard/services/dashboard.service.ts

import { LIMITS } from '../../../config/constants';
import * as dashboardRepository from '../repositories/dashboard.repository';
import { DashboardAnalytics, DashboardOverview } from '../types/dashboard.types';

export const getOverview = async (): Promise<DashboardOverview> => {
  // Two independent read-only queries - run them concurrently rather than
  // sequentially. They briefly take two pool connections, well within
  // DB_POOL_MAX.
  const [counters, recentActivity] = await Promise.all([
    dashboardRepository.getOverviewCounters(LIMITS.SUBSCRIPTION_EXPIRY_HORIZON_DAYS),
    dashboardRepository.getRecentActivity(LIMITS.RECENT_ACTIVITY_LIMIT),
  ]);

  return {
    admins: {
      total: counters.totalAdmins,
      active: counters.activeAdmins,
      inactive: counters.inactiveAdmins,
      suspended: counters.suspendedAdmins,
      activeLast7Days: counters.adminsActiveLast7d,
    },
    organizations: {
      total: counters.totalOrganizations,
      active: counters.activeOrganizations,
      inactive: counters.inactiveOrganizations,
      suspended: counters.suspendedOrganizations,
      newThisMonth: counters.organizationsThisMonth,
    },
    subscriptions: {
      total: counters.totalSubscriptions,
      active: counters.activeSubscriptions,
      trialing: counters.trialingSubscriptions,
      pastDue: counters.pastDueSubscriptions,
      cancelled: counters.cancelledSubscriptions,
      expiringWithinDays: LIMITS.SUBSCRIPTION_EXPIRY_HORIZON_DAYS,
      expiring: counters.expiringSubscriptions,
    },
    plans: { total: counters.totalPlans, active: counters.activePlans },
    revenue: { monthlyRecurring: counters.mrr },
    recentActivity,
    generatedAt: new Date().toISOString(),
  };
};

export const getAnalytics = async (days: number): Promise<DashboardAnalytics> => {
  const [growth, planDistribution] = await Promise.all([
    dashboardRepository.getGrowthSeries(days),
    dashboardRepository.getPlanDistribution(),
  ]);
  return {
    periodDays: days,
    growth,
    planDistribution,
    generatedAt: new Date().toISOString(),
  };
};
