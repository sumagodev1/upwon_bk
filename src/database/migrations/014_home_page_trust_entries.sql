-- Home page CMS: trust section as a list of entries.
--
-- 013 made the trust section one row holding its copy plus two JSONB lists.
-- This makes it a list of rows instead, shaped exactly like home_hero_slides:
-- one row per entry, every field a column, filled by one form and listed in
-- one table.
--
-- What that buys: the trust admin is now the hero admin. Same table, same
-- form, same validation, same reorder - nothing about it has to be learned
-- separately.
--
-- What it costs, stated plainly: the section copy is per row, so it repeats on
-- every entry. The public read takes the copy from the first active entry and
-- gathers the logos and stats from all of them, which keeps the rendered
-- section identical - but two entries could disagree about the heading, and
-- only the first would win. The create form pre-fills the copy from the newest
-- entry so that stays a theoretical problem rather than a typing chore.

CREATE TABLE home_trust_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section copy. Repeated per row; the public read uses the first active one.
  eyebrow         VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as the hero heading:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading         TEXT          NOT NULL,

  subtext         TEXT          NOT NULL,

  -- The brand logo this entry contributes to the marquee, if any. Same two
  -- mutually exclusive sources as the hero image.
  image_url       VARCHAR(1000),
  image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The brand name, and the logo's alt text. Required when there is a logo:
  -- a mark with no name is an invisible claim to a screen reader.
  image_alt       VARCHAR(255),

  -- The scale counter this entry contributes, if any. Text and not a number:
  -- '10,000+' and '4,200+' are editorial, and storing 10000 would take that
  -- choice away from the author.
  stat_value      VARCHAR(40),
  stat_label      VARCHAR(120),

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_trust_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_trust_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_trust_entries_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- A logo with no name would render as an unlabelled image.
  CONSTRAINT home_trust_entries_logo_needs_alt_check
    CHECK (
      (image_url IS NULL AND image_file_id IS NULL)
      OR btrim(COALESCE(image_alt, '')) <> ''
    ),

  -- A counter is both halves or neither; one alone renders as a dangling
  -- number or a label with nothing above it.
  CONSTRAINT home_trust_entries_stat_is_a_pair_check
    CHECK (
      (stat_value IS NULL AND stat_label IS NULL)
      OR (btrim(COALESCE(stat_value, '')) <> '' AND btrim(COALESCE(stat_label, '')) <> '')
    ),

  CONSTRAINT home_trust_entries_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_trust_entries_published_idx
  ON home_trust_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX home_trust_entries_image_file_idx
  ON home_trust_entries (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER home_trust_entries_set_updated_at
  BEFORE UPDATE ON home_trust_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * Carry the existing section across, zipping the two lists into rows.
 *
 * generate_series runs to the longer of the two, and `->` on an out-of-range
 * index yields NULL - so a section with six logos and four stats becomes six
 * rows, the last two carrying a logo and no counter. GREATEST(..., 1) keeps a
 * section that has neither list, so its copy is not lost.
 */
INSERT INTO home_trust_entries (
  eyebrow, heading, subtext,
  image_url, image_file_id, image_alt,
  stat_value, stat_label,
  display_order, status, created_by, updated_by
)
SELECT
  s.eyebrow,
  s.heading,
  s.subtext,
  NULLIF(s.logos -> i ->> 'imageUrl', ''),
  NULLIF(s.logos -> i ->> 'imageFileId', '')::uuid,
  NULLIF(s.logos -> i ->> 'alt', ''),
  NULLIF(s.stats -> i ->> 'value', ''),
  NULLIF(s.stats -> i ->> 'label', ''),
  i,
  s.status,
  s.created_by,
  s.updated_by
FROM home_trust_section s
CROSS JOIN LATERAL generate_series(
  0,
  GREATEST(jsonb_array_length(s.logos), jsonb_array_length(s.stats), 1) - 1
) AS i;

DROP TABLE home_trust_section;
