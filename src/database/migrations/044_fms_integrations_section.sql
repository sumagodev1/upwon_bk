-- FMS product page CMS: "One System - with Pre-Built Integrations."
--
-- Copy on the left, a rotating sphere of brand marks on the right. Two tables:
--
--   fms_integration_section  the mark at the core of the sphere, one record
--   fms_integration_logos    the marks pinned around it, one row each
--
-- The centre mark gets a singleton rather than repeating across every logo row
-- the way the home page's equivalent does. That arrangement dates from when
-- the section copy repeated too; the copy has since moved to
-- page_section_copy, which leaves the centre logo as the only field repeating -
-- and repeating it means either updating every row to change one image, or
-- rows that silently disagree about what the centre is.
--
-- A separate list from home_integrations_entries even though the artwork
-- overlaps today: the home page says "UPWON integrates with these" and this
-- says "UpWon FMS connects to these out of the box". The day a franchise
-- network's integration set stops matching the whole suite's, an editor needs
-- to be able to say so without touching the other page.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('fms', 'integrations'). That section key is already allowed - the home page
-- uses it - so no check widens here.

-- -- the mark at the core ---------------------------------------------------

CREATE TABLE fms_integration_section (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What an upsert conflicts on, so the first save creates the row and every
  -- later save replaces it.
  singleton               BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  /*
   * The mark at the centre of the sphere, from one of two mutually exclusive
   * sources. Optional, unlike the orbit logos: with none set the site falls
   * back to the mark it ships, which is a section that still renders correctly.
   */
  centre_logo_url         VARCHAR(1000),
  centre_logo_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  created_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_integration_section_singleton_check
    CHECK (singleton = TRUE),
  CONSTRAINT fms_integration_section_single_centre_source_check
    CHECK (centre_logo_url IS NULL OR centre_logo_file_id IS NULL)
);

CREATE INDEX fms_integration_section_centre_logo_file_idx
  ON fms_integration_section (centre_logo_file_id)
  WHERE centre_logo_file_id IS NOT NULL;

CREATE TRIGGER fms_integration_section_set_updated_at
  BEFORE UPDATE ON fms_integration_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- the marks around it ----------------------------------------------------

CREATE TABLE fms_integration_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The brand mark, from one of two mutually exclusive sources. Required: a
  -- row contributes nothing else, so one without a logo cannot appear at all.
  logo_url          VARCHAR(1000),
  logo_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The brand name, doubling as the logo's alt text.
  logo_alt          VARCHAR(160)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_integration_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_integration_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_integration_logos_single_logo_source_check
    CHECK (logo_url IS NULL OR logo_file_id IS NULL),
  CONSTRAINT fms_integration_logos_logo_required_check
    CHECK (logo_url IS NOT NULL OR logo_file_id IS NOT NULL),
  CONSTRAINT fms_integration_logos_not_blank_check
    CHECK (btrim(logo_alt) <> '')
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX fms_integration_logos_published_idx
  ON fms_integration_logos (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX fms_integration_logos_logo_file_idx
  ON fms_integration_logos (logo_file_id)
  WHERE logo_file_id IS NOT NULL;

CREATE TRIGGER fms_integration_logos_set_updated_at
  BEFORE UPDATE ON fms_integration_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
