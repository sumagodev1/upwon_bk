export interface OverviewCounters {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  suspendedAdmins: number;
  adminsActiveLast7d: number;

  totalOrganizations: number;
  activeOrganizations: number;
  inactiveOrganizations: number;
  suspendedOrganizations: number;
  organizationsThisMonth: number;

  totalSubscriptions: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  expiringSubscriptions: number;

  totalPlans: number;
  activePlans: number;

  /** Kept as a string - money never becomes a float. */
  mrr: string;
}

export interface RecentActivityItem {
  id: number;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  actor: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export interface GrowthPoint {
  day: string;
  organizationSignups: number;
  newSubscriptions: number;
  cancellations: number;
}

export interface PlanDistributionItem {
  id: string;
  name: string;
  code: string;
  price: string;
  currency: string;
  billingInterval: string;
  subscriberCount: number;
}

export interface DashboardOverview {
  admins: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    activeLast7Days: number;
  };
  organizations: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    newThisMonth: number;
  };
  subscriptions: {
    total: number;
    active: number;
    trialing: number;
    pastDue: number;
    cancelled: number;
    expiringWithinDays: number;
    expiring: number;
  };
  plans: { total: number; active: number };
  revenue: { monthlyRecurring: string };
  recentActivity: RecentActivityItem[];
  generatedAt: string;
}

export interface DashboardAnalytics {
  periodDays: number;
  growth: GrowthPoint[];
  planDistribution: PlanDistributionItem[];
  generatedAt: string;
}
