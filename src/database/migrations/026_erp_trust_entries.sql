-- ERP product page CMS: the proof strip.
--
-- Same shape as the home page's trust entries, and for the same reason: the
-- section renders one card carrying a logo marquee and a row of counters, and
-- one row per entry is what lets an administrator add either without a second
-- table. Entry N contributes at most one logo and at most one counter; the
-- two lists are gathered independently on read, so they need not line up.
--
-- The eyebrow, heading and subtext that head it are not here. They live once
-- in page_section_copy under ('erp', 'trust'), which is what makes them
-- something you author once rather than retype on every logo.

CREATE TABLE erp_trust_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The brand logo, from one of two mutually exclusive sources.
  image_url       VARCHAR(1000),
  image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The brand name, doubling as the logo's alt text.
  image_alt       VARCHAR(255),

  -- Display text, not a number: '10,000+' and '4,200+' are authored, and a
  -- counter that has to be formatted in the database is a counter that cannot
  -- say '30-45 days'.
  stat_value      VARCHAR(40),
  stat_label      VARCHAR(120),

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_trust_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT erp_trust_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT erp_trust_entries_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- A logo needs its brand name: that name is the alt text, and a logo with
  -- none is unreadable to anyone not looking at it.
  CONSTRAINT erp_trust_entries_image_alt_check
    CHECK (
      (image_url IS NULL AND image_file_id IS NULL)
      OR (image_alt IS NOT NULL AND btrim(image_alt) <> '')
    ),

  -- A counter is both halves or neither - one alone renders as a dangling
  -- number or a floating label.
  CONSTRAINT erp_trust_entries_stat_pair_check
    CHECK ((stat_value IS NULL) = (stat_label IS NULL)),

  -- An entry that carries neither a logo nor a counter contributes nothing.
  CONSTRAINT erp_trust_entries_not_empty_check
    CHECK (
      image_url IS NOT NULL OR image_file_id IS NOT NULL OR stat_value IS NOT NULL
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX erp_trust_entries_published_idx
  ON erp_trust_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX erp_trust_entries_image_file_idx
  ON erp_trust_entries (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER erp_trust_entries_set_updated_at
  BEFORE UPDATE ON erp_trust_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
