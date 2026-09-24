-- ERP product page CMS: the industry recognition switcher.
--
-- Three tables rather than one, because the section has three lists that are
-- edited and ordered independently:
--
--   erp_industries          the seven selectable industries
--   erp_industry_features   six or so per industry, so a child table
--   erp_industry_benefits   the strip along the bottom of the card
--
-- The label, heading and description that head the section are not here. They
-- live once in page_section_copy under ('erp', 'recognition'), and the orange
-- highlight is the **accent** marker inside the heading rather than a separate
-- column - which is how every other heading in this CMS already works.

CREATE TABLE erp_industries (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  name                  VARCHAR(160)  NOT NULL,
  -- Stable identifier for deep links and for the site to key its selection on,
  -- so renaming an industry does not change what a link points at.
  slug                  VARCHAR(80)   NOT NULL UNIQUE,
  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon                  VARCHAR(60)   NOT NULL,
  -- The line under the name in the selector.
  short_description     TEXT          NOT NULL,

  -- The right-hand panel when this industry is selected.
  erp_title             VARCHAR(200)  NOT NULL,
  erp_description       TEXT          NOT NULL,

  -- The industry photo, from one of two mutually exclusive sources.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Alt text for that photo. Nullable because the desktop copy is decorative
  -- and marked aria-hidden; the mobile banner is the one that reads it.
  image_alt             VARCHAR(255),

  -- The dashboard screenshot. The page shows one shared mockup today, so all
  -- seven are seeded with the same file - but it is stored per industry so a
  -- screenshot can be made specific to one without touching the rest.
  dashboard_url         VARCHAR(1000),
  dashboard_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  dashboard_alt         VARCHAR(255),

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_industries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_industries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT erp_industries_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT erp_industries_single_dashboard_source_check
    CHECK (dashboard_url IS NULL OR dashboard_file_id IS NULL),
  -- The photo is the panel: an industry without one renders a broken frame.
  CONSTRAINT erp_industries_image_required_check
    CHECK (image_url IS NOT NULL OR image_file_id IS NOT NULL),
  CONSTRAINT erp_industries_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT erp_industries_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(short_description) <> ''
      AND btrim(erp_title) <> '' AND btrim(erp_description) <> ''
      AND btrim(icon) <> ''
    )
);

CREATE INDEX erp_industries_published_idx
  ON erp_industries (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX erp_industries_image_file_idx
  ON erp_industries (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX erp_industries_dashboard_file_idx
  ON erp_industries (dashboard_file_id)
  WHERE dashboard_file_id IS NOT NULL;

CREATE TRIGGER erp_industries_set_updated_at
  BEFORE UPDATE ON erp_industries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Features ─────────────────────────────────────────────────────────────
--
-- Owned by their industry: deleting one takes its features with it, because a
-- feature has no meaning apart from the industry it describes.

CREATE TABLE erp_industry_features (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id     UUID          NOT NULL REFERENCES erp_industries(id) ON DELETE CASCADE,

  title           VARCHAR(160)  NOT NULL,
  description     TEXT          NOT NULL,
  icon            VARCHAR(60)   NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_industry_features_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_industry_features_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT erp_industry_features_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

-- Covers both the admin list (all of one industry's features, in order) and
-- the public read (the active ones), which are the only two queries.
CREATE INDEX erp_industry_features_by_industry_idx
  ON erp_industry_features (industry_id, display_order, created_at);

CREATE TRIGGER erp_industry_features_set_updated_at
  BEFORE UPDATE ON erp_industry_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Benefits ─────────────────────────────────────────────────────────────
--
-- Section-level, not per industry: the strip along the bottom of the card
-- shows the same four reasons whichever industry is selected, which is what
-- the page does today. Stored per industry it would be twenty-eight identical
-- rows to edit whenever one of the four changed.

CREATE TABLE erp_industry_benefits (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title           VARCHAR(160)  NOT NULL,
  icon            VARCHAR(60)   NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_industry_benefits_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_industry_benefits_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT erp_industry_benefits_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(icon) <> '')
);

CREATE INDEX erp_industry_benefits_published_idx
  ON erp_industry_benefits (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER erp_industry_benefits_set_updated_at
  BEFORE UPDATE ON erp_industry_benefits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
