/**
 * Single round trip returning one row of platform counters.
 *
 * Design notes:
 *  - Each table is scanned exactly once. COUNT(*) FILTER (WHERE ...) derives
 *    every counter from that one pass, instead of one subquery per counter.
 *  - The partial indexes (admins_status_idx, organizations_status_idx,
 *    subscriptions_status_idx, subscriptions_expiring_idx) make these
 *    index-only scans at realistic data volumes.
 *  - $1 is the "expiring soon" horizon in days.
 */
export const DASHBOARD_OVERVIEW_SQL = `
  WITH admin_stats AS (
    SELECT
      COUNT(*)                                     AS total_admins,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS active_admins,
      COUNT(*) FILTER (WHERE status = 'INACTIVE')  AS inactive_admins,
      COUNT(*) FILTER (WHERE status = 'SUSPENDED') AS suspended_admins,
      COUNT(*) FILTER (WHERE last_login_at >= now() - INTERVAL '7 days')
                                                   AS admins_active_last_7d
    FROM admins
    WHERE deleted_at IS NULL
  ),
  organization_stats AS (
    SELECT
      COUNT(*)                                     AS total_organizations,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS active_organizations,
      COUNT(*) FILTER (WHERE status = 'INACTIVE')  AS inactive_organizations,
      COUNT(*) FILTER (WHERE status = 'SUSPENDED') AS suspended_organizations,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))
                                                   AS organizations_this_month
    FROM organizations
    WHERE deleted_at IS NULL
  ),
  subscription_stats AS (
    SELECT
      COUNT(*)                                     AS total_subscriptions,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS active_subscriptions,
      COUNT(*) FILTER (WHERE status = 'TRIALING')  AS trialing_subscriptions,
      COUNT(*) FILTER (WHERE status = 'PAST_DUE')  AS past_due_subscriptions,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_subscriptions,
      COUNT(*) FILTER (
        WHERE status IN ('ACTIVE', 'TRIALING')
          AND end_date IS NOT NULL
          AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * INTERVAL '1 day')
      )                                            AS expiring_subscriptions
    FROM subscriptions
  ),
  revenue_stats AS (
    -- Monthly recurring revenue, normalised across billing intervals.
    -- LIFETIME plans are excluded: they are not recurring by definition.
    -- Summed in SQL and returned as text; summing NUMERIC in JavaScript would
    -- introduce float drift on money.
    SELECT COALESCE(SUM(
      CASE p.billing_interval
        WHEN 'MONTHLY'   THEN p.price
        WHEN 'QUARTERLY' THEN p.price / 3
        WHEN 'YEARLY'    THEN p.price / 12
        ELSE 0
      END
    ), 0)::text                                    AS mrr
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.status IN ('ACTIVE', 'TRIALING')
  ),
  plan_stats AS (
    SELECT
      COUNT(*)                                     AS total_plans,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS active_plans
    FROM plans
  )
  SELECT *
    FROM admin_stats,
         organization_stats,
         subscription_stats,
         revenue_stats,
         plan_stats
`;

/** Recent activity, joined to the actor. Deliberately capped and never paginated. */
export const DASHBOARD_RECENT_ACTIVITY_SQL = `
  SELECT
    al.id, al.action, al.module, al.entity_type, al.entity_id, al.created_at,
    a.id AS admin_id, a.first_name, a.last_name, a.email::text AS email
  FROM audit_logs al
  LEFT JOIN admins a ON a.id = al.admin_id
  ORDER BY al.created_at DESC, al.id DESC
  LIMIT $1
`;

/**
 * Time series for the analytics view.
 *
 * generate_series produces a complete date axis so the client never has to fill
 * gaps - days with no signups return 0 rather than being absent.
 */
export const DASHBOARD_GROWTH_SQL = `
  WITH date_axis AS (
    SELECT generate_series(
      date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day'),
      date_trunc('day', now()),
      INTERVAL '1 day'
    )::date AS day
  ),
  org_signups AS (
    SELECT created_at::date AS day, COUNT(*) AS count
    FROM organizations
    WHERE deleted_at IS NULL
      AND created_at >= date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day')
    GROUP BY 1
  ),
  new_subscriptions AS (
    SELECT created_at::date AS day, COUNT(*) AS count
    FROM subscriptions
    WHERE created_at >= date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day')
    GROUP BY 1
  ),
  cancellations AS (
    SELECT cancelled_at::date AS day, COUNT(*) AS count
    FROM subscriptions
    WHERE cancelled_at IS NOT NULL
      AND cancelled_at >= date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day')
    GROUP BY 1
  )
  SELECT
    d.day,
    COALESCE(o.count, 0) AS organization_signups,
    COALESCE(n.count, 0) AS new_subscriptions,
    COALESCE(c.count, 0) AS cancellations
  FROM date_axis d
  LEFT JOIN org_signups       o ON o.day = d.day
  LEFT JOIN new_subscriptions n ON n.day = d.day
  LEFT JOIN cancellations     c ON c.day = d.day
  ORDER BY d.day ASC
`;

/** Plan distribution - how many live subscriptions sit on each plan. */
export const DASHBOARD_PLAN_DISTRIBUTION_SQL = `
  SELECT
    p.id, p.name, p.code, p.price::text AS price, p.currency, p.billing_interval,
    COUNT(s.id) FILTER (WHERE s.status IN ('ACTIVE', 'TRIALING')) AS subscriber_count
  FROM plans p
  LEFT JOIN subscriptions s ON s.plan_id = p.id
  WHERE p.status = 'ACTIVE'
  GROUP BY p.id, p.name, p.code, p.price, p.currency, p.billing_interval
  ORDER BY subscriber_count DESC, p.name ASC
`;
