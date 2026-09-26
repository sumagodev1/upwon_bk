-- HREasy product page CMS: "Advanced Platform for Every HR Need - From
-- Recruitment to Retirement."
--
-- A vertical list of lifecycle stages down the left, and beside the selected
-- one a panel carrying that stage's icon, heading, line and artwork. Seven
-- stages today, from Recruitment & Onboarding to Offboarding.
--
-- One table, not the three the FMS page's category switcher carries: that
-- section's panel holds a five-step flow and a three-benefit strip, which are
-- their own rows because they are their own edits. This panel holds one
-- composite image - the dashboard mock, the photograph and the pipeline under
-- it are all artwork - so there is nothing underneath a module to own.
--
-- The eyebrow, heading and subtext above the list live once in
-- page_section_copy under ('hreasy', 'capabilities'). That section key is new,
-- so the table's check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
      -- home page
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      -- ERP product page
      'hero', 'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers',
      -- SFA-DMS product page
      'proof', 'video', 'packages',
      -- HREasy product page
      'capabilities'
    ));

-- ── the modules ───────────────────────────────────────────────────────────

CREATE TABLE hreasy_capability_modules (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The row label on the left and the panel heading on the right - one
  -- string, drawn twice, because they are always the same words.
  name              VARCHAR(160)  NOT NULL,
  /*
   * Stable across renames, so the site can key its selected row on something
   * an editor's wording change cannot move - and so a link into the page can
   * open on a particular stage.
   */
  slug              VARCHAR(80)   NOT NULL UNIQUE,

  /*
   * The pictogram in the orange tile at the top of the panel. A name from the
   * page's allowlist, not a file: the site draws these with lucide-react,
   * which exports components rather than images.
   */
  icon              VARCHAR(60)   NOT NULL,

  -- The line under the heading: "Structured hiring from job description to
  -- day one."
  description       TEXT          NOT NULL,

  /*
   * The panel artwork, from one of two mutually exclusive sources, and
   * required: the panel is mostly this image, so a module without one is an
   * empty card rather than a plainer card.
   *
   * One image, not a desktop/mobile pair - the composite is drawn contained
   * inside the panel at both widths, so the same file serves both viewports.
   */
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_capability_modules_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_capability_modules_display_order_check
    CHECK (display_order >= 0),
  -- Lowercase words joined by single hyphens, the same shape the FMS page's
  -- category slugs carry.
  CONSTRAINT hreasy_capability_modules_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Exactly one source: neither both at once nor neither at all.
  CONSTRAINT hreasy_capability_modules_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT hreasy_capability_modules_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(icon) <> '' AND btrim(description) <> ''
    )
);

CREATE INDEX idx_hreasy_capability_modules_order
  ON hreasy_capability_modules (display_order, created_at);
CREATE INDEX idx_hreasy_capability_modules_status
  ON hreasy_capability_modules (status);
CREATE INDEX idx_hreasy_capability_modules_image_file
  ON hreasy_capability_modules (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER hreasy_capability_modules_set_updated_at
  BEFORE UPDATE ON hreasy_capability_modules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
