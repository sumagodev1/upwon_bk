-- Home page CMS: platform integrations.
--
-- One table per section, one row per orbit logo - the same shape as the hero's
-- slides, the trust entries, the industries entries and the values cards, so
-- the admin screen, the validation and the routes are all the ones already in
-- place.
--
-- The section copy repeats on every row and the public read takes it from the
-- first active logo, the same arrangement as the trust and values sections.
--
-- The centre logo repeats the same way, and for the same reason. It is one
-- image for the whole section rather than a property of any single orbit logo,
-- but it is only three columns; a second table holding exactly one row would
-- be a join and a lifecycle to maintain for no gain, and the public read
-- already has to pick a row for the copy.

CREATE TABLE home_integrations_entries (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section copy. Repeated per row; the public read uses the first active one.
  eyebrow                 VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as the other sections' headings:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading                 TEXT          NOT NULL,

  subtext                 TEXT          NOT NULL,

  -- The mark at the core of the sphere. Shared across the section, like the
  -- copy above, and optional: with none set the site falls back to the logo it
  -- ships, which is the right answer for a section that still renders.
  centre_logo_url         VARCHAR(1000),
  centre_logo_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- This row's own orbit logo - one of the brand marks pinned to the sphere.
  -- Required: an entry contributes nothing else, so one without a logo is a
  -- row that cannot appear on the site at all.
  logo_url                VARCHAR(1000),
  logo_file_id            UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The brand name, doubling as the logo's alt text.
  logo_alt                VARCHAR(160)  NOT NULL,

  display_order           INTEGER       NOT NULL DEFAULT 0,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_integrations_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_integrations_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_integrations_entries_single_logo_source_check
    CHECK (logo_url IS NULL OR logo_file_id IS NULL),

  CONSTRAINT home_integrations_entries_logo_required_check
    CHECK (logo_url IS NOT NULL OR logo_file_id IS NOT NULL),

  CONSTRAINT home_integrations_entries_single_centre_source_check
    CHECK (centre_logo_url IS NULL OR centre_logo_file_id IS NULL),

  CONSTRAINT home_integrations_entries_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
      AND btrim(logo_alt) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_integrations_entries_published_idx
  ON home_integrations_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
-- Two indexes rather than one on both columns: they are read one at a time.
CREATE INDEX home_integrations_entries_logo_file_idx
  ON home_integrations_entries (logo_file_id)
  WHERE logo_file_id IS NOT NULL;

CREATE INDEX home_integrations_entries_centre_logo_file_idx
  ON home_integrations_entries (centre_logo_file_id)
  WHERE centre_logo_file_id IS NOT NULL;

CREATE TRIGGER home_integrations_entries_set_updated_at
  BEFORE UPDATE ON home_integrations_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
