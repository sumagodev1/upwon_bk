-- Home page CMS: one table per section.
--
-- 012 gave the trust section three tables - the copy, plus a child table each
-- for the logo marquee and the stat row. This folds the two lists into JSONB
-- columns on the section row, so a section is one table and one row, with its
-- repeating fields held as fields.
--
-- The lists are not entities in their own right: nothing references a trust
-- logo, nothing queries across them, and they are only ever read as part of
-- "the whole section". Child tables bought foreign keys and indexes that
-- nothing used, at the cost of two extra tables and a join to render one card.
-- Array position also replaces display_order outright, which removes the
-- reorder path a child table needs.
--
-- The trade-off worth naming: image_file_id inside JSONB cannot be a foreign
-- key, so deleting an uploaded file now leaves a dangling id rather than being
-- NULLed by the database. The read path already tolerates that - a logo whose
-- asset has gone resolves to null and is dropped from the response instead of
-- rendering broken - so the behaviour on a missing file is unchanged.

ALTER TABLE home_trust_section
  ADD COLUMN logos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN stats JSONB NOT NULL DEFAULT '[]'::jsonb;

/*
 * Carry the existing rows across before the tables go.
 *
 * Ordered by the same (display_order, created_at) the read path used, so the
 * array order that replaces display_order is exactly the order the site was
 * already rendering. Only ACTIVE rows survive: the JSONB entries have no
 * status of their own, and an INACTIVE row was invisible on the site, so
 * carrying it over would silently publish it.
 */
UPDATE home_trust_section s
   SET logos = COALESCE(
         (SELECT jsonb_agg(
                   jsonb_strip_nulls(
                     jsonb_build_object(
                       'imageUrl', l.image_url,
                       'imageFileId', l.image_file_id,
                       'alt', l.alt
                     )
                   )
                   ORDER BY l.display_order, l.created_at
                 )
            FROM home_trust_logos l
           WHERE l.status = 'ACTIVE'),
         '[]'::jsonb
       ),
       stats = COALESCE(
         (SELECT jsonb_agg(
                   jsonb_build_object('value', t.value, 'label', t.label)
                   ORDER BY t.display_order, t.created_at
                 )
            FROM home_trust_stats t
           WHERE t.status = 'ACTIVE'),
         '[]'::jsonb
       )
 WHERE s.singleton;

DROP TABLE home_trust_logos;
DROP TABLE home_trust_stats;

-- Arrays, not objects or scalars. Cheap to assert, and it stops a malformed
-- write turning every subsequent read into a type error in the mapper.
ALTER TABLE home_trust_section
  ADD CONSTRAINT home_trust_section_lists_are_arrays_check
    CHECK (jsonb_typeof(logos) = 'array' AND jsonb_typeof(stats) = 'array');

COMMENT ON COLUMN home_trust_section.logos IS
  'Brand marquee in render order. Entries: { imageUrl | imageFileId, alt }.';
COMMENT ON COLUMN home_trust_section.stats IS
  'Scale counters in render order. Entries: { value, label }; value is display text.';
