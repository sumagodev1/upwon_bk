-- FMS product page CMS: the franchise category map.
--
-- "Special Extensions for Bakery, Sweets, Ice Cream and QSR Franchises" - a row
-- of category tabs, and under the selected one a panel with its photograph, a
-- five-step "how it works for you" flow, and a strip of three benefits.
--
-- Three tables, because they are three independent edits:
--
--   fms_franchise_categories  the tabs and the panel behind each
--   fms_franchise_steps       that category's flow, five today
--   fms_franchise_benefits    that category's strip, three today
--
-- Both children cascade: a step or a benefit has no meaning apart from the
-- category it describes. This is where the section departs from the ERP page's
-- industry switcher, whose benefits strip is section-level - there the same
-- four reasons show whichever industry is selected, here every category makes
-- its own three claims ("Lower Wastage" for bakery, "Royalty Accuracy" for
-- sweets), so they are owned by the category rather than shared across them.
--
-- The eyebrow, heading and subtext above the tabs live once in
-- page_section_copy under ('fms', 'recognition'). That section key is already
-- allowed - the ERP page uses it - so no check widens here.

-- -- the categories --------------------------------------------------------

CREATE TABLE fms_franchise_categories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The tab label and the panel heading - one string, drawn twice.
  name              VARCHAR(160)  NOT NULL,
  -- Stable across renames, so the site can key its selection on something an
  -- editor's wording change cannot move.
  slug              VARCHAR(80)   NOT NULL UNIQUE,
  -- The line under the name: "Central Kitchen", "Cold-Chain".
  tagline           VARCHAR(120)  NOT NULL,
  -- The paragraph in the panel.
  description       TEXT          NOT NULL,

  -- The tab's pictogram, from one of two mutually exclusive sources. An image
  -- rather than an icon name: these are artwork the brand commissioned, not
  -- line icons lucide happens to export.
  icon_url          VARCHAR(1000),
  icon_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The photograph behind the panel, same two sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The tab fill, the icon wash and the link colour, authored once as #RRGGBB.
  -- The site derives the 12% wash from it rather than storing a second value.
  accent_color      CHAR(7)       NOT NULL DEFAULT '#E85A2A',
  -- The pale ground the panel copy sits on, washed over the photograph. Stored
  -- rather than derived: it is not the accent at an alpha - #FBE9E2 is warmer
  -- than #E85A2A at 12% over white - so deriving it would change the design.
  surface_color     CHAR(7)       NOT NULL DEFAULT '#FBE9E2',

  -- The link out of the panel: "Explore Sweets Model".
  explore_label     VARCHAR(120)  NOT NULL,
  explore_href      VARCHAR(500)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_franchise_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_franchise_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_franchise_categories_single_icon_source_check
    CHECK (icon_url IS NULL OR icon_file_id IS NULL),
  CONSTRAINT fms_franchise_categories_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- Both are the section: a tab with no pictogram is a blank square, and a
  -- panel with no photograph is a white box behind the copy.
  CONSTRAINT fms_franchise_categories_icon_required_check
    CHECK (icon_url IS NOT NULL OR icon_file_id IS NOT NULL),
  CONSTRAINT fms_franchise_categories_image_required_check
    CHECK (image_url IS NOT NULL OR image_file_id IS NOT NULL),
  CONSTRAINT fms_franchise_categories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Uppercase, so the site slices the pair apart the same way every time.
  CONSTRAINT fms_franchise_categories_accent_color_check
    CHECK (accent_color ~ '^#[0-9A-F]{6}$'),
  CONSTRAINT fms_franchise_categories_surface_color_check
    CHECK (surface_color ~ '^#[0-9A-F]{6}$'),
  CONSTRAINT fms_franchise_categories_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(tagline) <> '' AND btrim(description) <> ''
      AND btrim(explore_label) <> '' AND btrim(explore_href) <> ''
    )
);

CREATE INDEX fms_franchise_categories_published_idx
  ON fms_franchise_categories (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX fms_franchise_categories_icon_file_idx
  ON fms_franchise_categories (icon_file_id)
  WHERE icon_file_id IS NOT NULL;

CREATE INDEX fms_franchise_categories_image_file_idx
  ON fms_franchise_categories (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER fms_franchise_categories_set_updated_at
  BEFORE UPDATE ON fms_franchise_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- the flow ---------------------------------------------------------------
--
-- The "01, 02, 03" numbers are not stored: they are the position in the flow,
-- and storing them would let a row claim "03" while sitting second.

CREATE TABLE fms_franchise_steps (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID          NOT NULL
                                  REFERENCES fms_franchise_categories(id) ON DELETE CASCADE,

  title             VARCHAR(160)  NOT NULL,
  description       TEXT          NOT NULL,
  -- A name from the icon allowlist, not a file: the flow's icons are lucide
  -- line icons, which are components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_franchise_steps_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_franchise_steps_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_franchise_steps_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

-- Covers both the admin list (one category's steps, in order) and the public
-- read (the active ones), which are the only two queries.
CREATE INDEX fms_franchise_steps_by_category_idx
  ON fms_franchise_steps (category_id, display_order, created_at);

CREATE TRIGGER fms_franchise_steps_set_updated_at
  BEFORE UPDATE ON fms_franchise_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- the benefits strip -----------------------------------------------------

CREATE TABLE fms_franchise_benefits (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID          NOT NULL
                                  REFERENCES fms_franchise_categories(id) ON DELETE CASCADE,

  title             VARCHAR(160)  NOT NULL,
  description       TEXT          NOT NULL,
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_franchise_benefits_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_franchise_benefits_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_franchise_benefits_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

CREATE INDEX fms_franchise_benefits_by_category_idx
  ON fms_franchise_benefits (category_id, display_order, created_at);

CREATE TRIGGER fms_franchise_benefits_set_updated_at
  BEFORE UPDATE ON fms_franchise_benefits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
