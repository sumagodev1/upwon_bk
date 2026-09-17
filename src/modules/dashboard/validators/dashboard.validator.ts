// src/modules/dashboard/validators/dashboard.validator.ts

import { LIMITS } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';

export const validateAnalyticsQuery = (query: Record<string, unknown>): number => {
  const v = validator(query);
  const days =
    v.optionalNumber('days', {
      integer: true,
      min: 1,
      max: LIMITS.ANALYTICS_MAX_DAYS,
    }) ?? LIMITS.ANALYTICS_DEFAULT_DAYS;
  v.assert();
  return days;
};
