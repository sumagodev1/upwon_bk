-- Home page CMS: at most one active industries entry.
--
-- The section renders a single block. Until now the read simply took the first
-- active entry, which meant a second active one was legal but invisible - and
-- the only way to tell which was live was to know the display order. Making it
-- a constraint instead means the panel cannot get into that state at all: to
-- put a different entry live you deactivate or delete the current one first,
-- which is the same decision, just made explicitly.
--
-- Inactive entries stay unlimited, so alternates can still be drafted beside
-- the live one.

/*
 * Anything already in the second-or-later active position is deactivated, so
 * the index below can be created. Keeps the one the site was actually showing -
 * the first in display order - which is exactly what visitors were seeing, so
 * this changes nothing about the rendered page.
 */
UPDATE home_industries_entries
   SET status = 'INACTIVE'
 WHERE status = 'ACTIVE'
   AND id <> (
     SELECT id
       FROM home_industries_entries
      WHERE status = 'ACTIVE'
      ORDER BY display_order ASC, created_at ASC
      LIMIT 1
   );

/*
 * A partial unique index over a constant column value.
 *
 * Every ACTIVE row would have to share the same key, so only one can exist;
 * INACTIVE rows are outside the predicate and are not constrained at all. The
 * service checks this first and returns a readable 409, but the index is what
 * actually guarantees it under concurrent writes.
 */
CREATE UNIQUE INDEX home_industries_entries_single_active_idx
  ON home_industries_entries (status)
  WHERE status = 'ACTIVE';
