import { BillingInterval } from '../../../config/constants';

/**
 * LIFETIME subscriptions have no end date; everything else does.
 *
 * setMonth handles month-length rollover the way most billing systems expect
 * (Jan 31 + 1 month -> Mar 3 in a non-leap year). If the product needs
 * end-of-month clamping instead, that belongs here as an explicit rule rather
 * than as a silent side effect of Date.
 */
export function computeEndDate(startDate: Date, interval: BillingInterval): Date | null {
  const end = new Date(startDate);
  switch (interval) {
    case 'MONTHLY':
      end.setMonth(end.getMonth() + 1);
      return end;
    case 'QUARTERLY':
      end.setMonth(end.getMonth() + 3);
      return end;
    case 'YEARLY':
      end.setFullYear(end.getFullYear() + 1);
      return end;
    case 'LIFETIME':
      return null;
  }
}
