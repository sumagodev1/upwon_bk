// src/modules/plans/validators/plan.validator.ts

import { BILLING_INTERVALS, PLAN_STATUSES } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { CreatePlanInput, PlanFilters, UpdatePlanInput } from '../types/plan.types';

const PLAN_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_]{1,59}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function validateCreatePlan(body: unknown): CreatePlanInput {
  const v = validator(body);
  const code = v.requiredString('code', { min: 2, max: 60 });
  v.custom(
    code === '' || PLAN_CODE_PATTERN.test(code),
    'code',
    'Plan code must be uppercase letters, digits, and underscores',
    'INVALID_PLAN_CODE',
  );

  const currency = v.optionalString('currency', { min: 3, max: 3 }) ?? 'USD';
  v.custom(
    CURRENCY_PATTERN.test(currency),
    'currency',
    'Currency must be a 3-letter ISO 4217 code',
    'INVALID_CURRENCY',
  );

  const dto: CreatePlanInput = {
    name: v.requiredString('name', { min: 2, max: 120 }),
    code,
    description: v.optionalString('description', { max: 2000 }) ?? null,
    price: v.requiredDecimal('price', { min: 0, scale: 2 }),
    currency,
    billingInterval: v.requiredEnum('billingInterval', BILLING_INTERVALS),
    features: v.jsonObject('features'),
    status: v.optionalEnum('status', PLAN_STATUSES) ?? 'ACTIVE',
  };
  v.assert();
  return dto;
}

export function validateUpdatePlan(body: unknown): UpdatePlanInput {
  const v = validator(body);
  v.custom(
    !v.has('code'),
    'code',
    'Plan code is immutable; create a new plan instead',
    'IMMUTABLE_FIELD',
  );
  v.requireAtLeastOne([
    'name',
    'description',
    'price',
    'currency',
    'billingInterval',
    'features',
    'status',
  ]);

  const currency = v.has('currency')
    ? v.requiredString('currency', { min: 3, max: 3 })
    : undefined;
  if (currency !== undefined) {
    v.custom(
      CURRENCY_PATTERN.test(currency),
      'currency',
      'Currency must be a 3-letter ISO 4217 code',
      'INVALID_CURRENCY',
    );
  }

  const dto: UpdatePlanInput = {
    name: v.optionalString('name', { min: 2, max: 120 }),
    description: v.has('description')
      ? (v.optionalString('description', { max: 2000 }) ?? null)
      : undefined,
    price: v.optionalDecimal('price', { min: 0, scale: 2 }),
    currency,
    billingInterval: v.optionalEnum('billingInterval', BILLING_INTERVALS),
    features: v.has('features') ? v.jsonObject('features') : undefined,
    status: v.optionalEnum('status', PLAN_STATUSES),
  };
  v.assert();
  return dto;
}

export function validatePlanListQuery(query: Record<string, unknown>): {
  filters: PlanFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PlanFilters = {
    status: v.optionalEnum('status', PLAN_STATUSES),
    billingInterval: v.optionalEnum('billingInterval', BILLING_INTERVALS),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
