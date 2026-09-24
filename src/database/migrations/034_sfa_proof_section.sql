-- SFA-DMS product page CMS: "Not a Pitch. Just What's Already Running."
--
-- One heading over two panels. The left is a single card - a claim, the
-- sentence under it, a link to the clients page and a marquee of customer
-- logos. The right is a two-by-two grid of numbers.
--
-- Three tables, because those are three different things an editor changes on
-- different days: the card's wording is rewritten, a logo is added when a
-- brand goes live, and a figure is revised when the quarter's numbers land.
--
-- The eyebrow and heading above both panels are not here. They live once in
-- page_section_copy under ('sfa-dms', 'proof'), as every other section's do.

-- The section key is new, so the table's check widens first.
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
      'proof'
    ));

-- ── the left card ─────────────────────────────────────────────────────────
--
-- One record: the page has one card. The singleton column is what an upsert
-- conflicts on, so the first save creates it and every later save replaces it.

CREATE TABLE sfa_proof_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  heading           VARCHAR(160)  NOT NULL,
  -- The paragraph under the heading. TEXT rather than VARCHAR: it is the one
  -- field here an editor may want to run long.
  body_text         TEXT          NOT NULL,

  -- The link under the paragraph. Both halves or neither - a label with no
  -- destination is a dead link, and a destination with no label is invisible.
  link_label        VARCHAR(120),
  link_href         VARCHAR(500),

  -- The small caps line above the logo marquee ("Trusted by"). Optional: with
  -- no label the logos still read as customers, just without the introduction.
  logos_label       VARCHAR(120),

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_proof_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT sfa_proof_panel_not_blank_check
    CHECK (btrim(heading) <> '' AND btrim(body_text) <> ''),
  CONSTRAINT sfa_proof_panel_link_pair_check
    CHECK (num_nonnulls(link_label, link_href) <> 1)
);

-- ── the customer logos ────────────────────────────────────────────────────
--
-- The marquee inside the left card. A separate list from the home page's trust
-- logos even though the artwork overlaps today: that strip says "brands that
-- trust UpWon" across the whole company, this one says "brands running SFA-DMS
-- specifically", and the day those two stop being the same set an editor needs
-- to be able to say so without breaking the other page.

CREATE TABLE sfa_proof_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The mark, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The brand name, read aloud by a screen reader in place of the image.
  alt               VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_proof_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_proof_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- Unlike the optional artwork elsewhere, a logo with no image is nothing at
  -- all: the row exists only to show one.
  CONSTRAINT sfa_proof_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT sfa_proof_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_sfa_proof_logos_order ON sfa_proof_logos (display_order, created_at);
CREATE INDEX idx_sfa_proof_logos_status ON sfa_proof_logos (status);

-- ── the numbers ───────────────────────────────────────────────────────────
--
-- The two-by-two grid on the right. The figure is text rather than a number:
-- "5,000+", "40%" and "50+" are all written the way they are read, and the
-- grid renders them verbatim.

CREATE TABLE sfa_proof_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_proof_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_proof_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

CREATE INDEX idx_sfa_proof_stats_order ON sfa_proof_stats (display_order, created_at);
CREATE INDEX idx_sfa_proof_stats_status ON sfa_proof_stats (status);
