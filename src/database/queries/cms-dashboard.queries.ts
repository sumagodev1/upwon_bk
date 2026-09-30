// src/database/queries/cms-dashboard.queries.ts

/**
 * The CMS dashboard's counters.
 *
 * One statement per group rather than one per number: the panel draws them
 * together, so a dozen round trips would show a screen that fills in raggedly
 * for no benefit.
 *
 * Every count is a plain COUNT over a table this installation actually has.
 * Nothing here is derived, estimated or projected - if a figure cannot be
 * taken from a row, the dashboard does not show it.
 */

/**
 * The public site's five inbox tables.
 *
 * `last_7d` is a rolling window rather than "this week": an editor opening the
 * panel on a Monday morning cares what has arrived since they last looked, not
 * what happened to fall inside a calendar boundary.
 *
 * `needs_attention` exists only for careers, which is the one of the five with
 * a status column. The others return NULL, and the panel omits the figure
 * rather than printing a zero it cannot stand behind.
 */
export const CMS_DASHBOARD_INBOXES_SQL = `
  SELECT
    (SELECT count(*) FROM contact_enquiries)                                    AS contact_total,
    (SELECT count(*) FROM contact_enquiries
      WHERE created_at >= now() - INTERVAL '7 days')                            AS contact_7d,

    (SELECT count(*) FROM career_applications)                                  AS careers_total,
    (SELECT count(*) FROM career_applications
      WHERE created_at >= now() - INTERVAL '7 days')                            AS careers_7d,
    (SELECT count(*) FROM career_applications WHERE status = 'NEW')             AS careers_new,

    (SELECT count(*) FROM partner_program_applications)                         AS partner_total,
    (SELECT count(*) FROM partner_program_applications
      WHERE created_at >= now() - INTERVAL '7 days')                            AS partner_7d,

    (SELECT count(*) FROM about_discovery_calls)                                AS discovery_total,
    (SELECT count(*) FROM about_discovery_calls
      WHERE created_at >= now() - INTERVAL '7 days')                            AS discovery_7d,

    (SELECT count(*) FROM free_audit_applications)                              AS audit_total,
    (SELECT count(*) FROM free_audit_applications
      WHERE created_at >= now() - INTERVAL '7 days')                            AS audit_7d
`;

/**
 * The content areas that are lists an editor adds to.
 *
 * Deliberately not every table: the schema has well over two hundred, most of
 * them a handful of rows belonging to one section of one page, and counting
 * them all would produce a wall of numbers nobody reads. These are the areas
 * where "how many are there?" is a question someone actually asks.
 *
 * `published` is NULL where the table has no status column, so the panel shows
 * one number instead of the same number twice.
 */
export const CMS_DASHBOARD_CONTENT_SQL = `
  SELECT
    (SELECT count(*) FROM blog_posts)                                           AS blog_total,
    (SELECT count(*) FROM blog_posts WHERE status = 'ACTIVE')                   AS blog_published,

    (SELECT count(*) FROM kb_articles)                                          AS kb_total,
    (SELECT count(*) FROM kb_articles WHERE status = 'ACTIVE')                  AS kb_published,

    (SELECT count(*) FROM career_vacancies)                                     AS vacancies_total,
    (SELECT count(*) FROM career_vacancies WHERE status = 'ACTIVE')             AS vacancies_published,

    (SELECT count(*) FROM clients_case_cards)                                   AS cases_total,
    (SELECT count(*) FROM clients_case_cards WHERE status = 'ACTIVE')           AS cases_published,

    (SELECT count(*) FROM clients_testimonials)                                 AS testimonials_total,
    (SELECT count(*) FROM clients_testimonials WHERE status = 'ACTIVE')         AS testimonials_published,

    (SELECT count(*) FROM insider_issues)                                       AS issues_total,
    (SELECT count(*) FROM insider_issues WHERE status = 'ACTIVE')               AS issues_published
`;

/**
 * The daily series behind the dashboard's two charts.
 *
 * `generate_series` builds the whole date axis first and the counts are joined
 * onto it, so a day with nothing on it comes back as 0 rather than being
 * absent - the client never has to fill gaps, and a quiet week reads as a flat
 * line rather than a shorter one.
 *
 * Both measures ride one row per day because they share an axis. They are
 * drawn as two charts, not two lines on one: edits run to hundreds a day and
 * submissions to single figures, and putting them on one pair of axes would
 * either flatten the submissions to nothing or need a second y-scale.
 *
 * The axis is built in the database's own timezone, which is what every
 * created_at is stored against - doing it in the client would slice the days
 * against the reader's clock and disagree with the counts.
 */
export const CMS_DASHBOARD_SERIES_SQL = `
  WITH axis AS (
    SELECT generate_series(
      date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day'),
      date_trunc('day', now()),
      INTERVAL '1 day'
    )::date AS day
  ),
  edits AS (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS n
      FROM audit_logs
     WHERE created_at >= date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day')
     GROUP BY 1
  ),
  submissions AS (
    SELECT day, count(*) AS n FROM (
      SELECT date_trunc('day', created_at)::date AS day FROM contact_enquiries
      UNION ALL
      SELECT date_trunc('day', created_at)::date FROM career_applications
      UNION ALL
      SELECT date_trunc('day', created_at)::date FROM partner_program_applications
      UNION ALL
      SELECT date_trunc('day', created_at)::date FROM about_discovery_calls
      UNION ALL
      SELECT date_trunc('day', created_at)::date FROM free_audit_applications
    ) all_forms
     WHERE day >= (date_trunc('day', now()) - (($1::int - 1) * INTERVAL '1 day'))::date
     GROUP BY 1
  )
  SELECT
    axis.day::text                  AS day,
    COALESCE(edits.n, 0)::int       AS edits,
    COALESCE(submissions.n, 0)::int AS submissions
  FROM axis
  LEFT JOIN edits       ON edits.day = axis.day
  LEFT JOIN submissions ON submissions.day = axis.day
  ORDER BY axis.day
`;

/**
 * The signed-in admin's own last few changes.
 *
 * The same shape as DASHBOARD_RECENT_ACTIVITY_SQL so both feed one mapper -
 * this one just narrows to the actor and is fed their id.
 */
export const CMS_DASHBOARD_MY_ACTIVITY_SQL = `
  SELECT
    al.id, al.action, al.module, al.entity_type, al.entity_id, al.created_at,
    a.id AS admin_id, a.first_name, a.last_name, a.email::text AS email
  FROM audit_logs al
  LEFT JOIN admins a ON a.id = al.admin_id
  WHERE al.admin_id = $1
  ORDER BY al.created_at DESC, al.id DESC
  LIMIT $2
`;
