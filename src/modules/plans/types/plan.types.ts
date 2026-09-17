import { BillingInterval, PlanStatus } from '../../../config/constants';

export type { BillingInterval, PlanStatus };

export interface Plan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  /**
   * NUMERIC(12,2) arrives from pg as a STRING and stays one all the way to the
   * client. Formatting is the UI's job; converting to a JS number here would
   * silently corrupt large amounts.
   */
  price: string;
  currency: string;
  billingInterval: BillingInterval;
  features: Record<string, unknown>;
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanWithUsage extends Plan {
  activeSubscriptions: number;
}

export interface CreatePlanInput {
  name: string;
  code: string;
  description?: string | null;
  price: string;
  currency: string;
  billingInterval: BillingInterval;
  features: Record<string, unknown>;
  status: PlanStatus;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string | null;
  price?: string;
  currency?: string;
  billingInterval?: BillingInterval;
  features?: Record<string, unknown>;
  status?: PlanStatus;
}

export interface PlanFilters {
  status?: PlanStatus;
  billingInterval?: BillingInterval;
}
