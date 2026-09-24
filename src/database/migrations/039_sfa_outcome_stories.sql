-- SFA-DMS product page CMS: "Real Outcomes for Every Distribution Team."
--
-- A carousel of named customer stories: a portrait, the outcome as a headline,
-- the story under it, and who said it.
--
-- Two tables. One holds the pair of buttons beside the heading, because they
-- are a single small form. The other holds the cards, which are a list that
-- grows every time a customer agrees to be named.
--
-- The eyebrow and heading live once in page_section_copy under
-- ('sfa-dms', 'outcomes'). That section key is already allowed - the ERP page
-- uses it - so no check widens here. The design has no line under the heading,
-- which is why subtext stays null.

-- ── the two buttons beside the heading ────────────────────────────────────

CREATE TABLE sfa_outcome_section (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The filled button: the page's main invitation.
  primary_label     VARCHAR(120)  NOT NULL,
  primary_href      VARCHAR(500)  NOT NULL,
  -- The outlined one beside it, usually to the full list of stories.
  secondary_label   VARCHAR(120)  NOT NULL,
  secondary_href    VARCHAR(500)  NOT NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_outcome_section_singleton_check
    CHECK (singleton),
  CONSTRAINT sfa_outcome_section_not_blank_check
    CHECK (
      btrim(primary_label) <> ''
      AND btrim(primary_href) <> ''
      AND btrim(secondary_label) <> ''
      AND btrim(secondary_href) <> ''
    )
);

-- ── the story cards ───────────────────────────────────────────────────────

CREATE TABLE sfa_outcome_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The outcome, written as a sentence rather than a label.
  title             VARCHAR(255)  NOT NULL,
  -- How it happened. TEXT: this is the one field that runs long.
  body              TEXT          NOT NULL,

  -- Who said it.
  person_name       VARCHAR(160)  NOT NULL,
  -- Their title, drawn in the section's orange under the name.
  person_role       VARCHAR(160)  NOT NULL,
  company           VARCHAR(160)  NOT NULL,

  /*
   * The portrait, from one of two mutually exclusive sources.
   *
   * Required, unlike the optional artwork elsewhere: the card is half portrait
   * tile, and one without an image is a coloured square beside the words.
   */
  photo_url         VARCHAR(1000),
  photo_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  /*
   * Where the corner arrow goes. Optional: a story that has no case study
   * behind it yet simply shows no arrow, which is a quieter card rather than a
   * broken one.
   */
  link_href         VARCHAR(500),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_outcome_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_outcome_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT sfa_outcome_cards_single_photo_source_check
    CHECK (photo_url IS NULL OR photo_file_id IS NULL),
  CONSTRAINT sfa_outcome_cards_photo_required_check
    CHECK (num_nonnulls(photo_url, photo_file_id) = 1),
  CONSTRAINT sfa_outcome_cards_not_blank_check
    CHECK (
      btrim(title) <> ''
      AND btrim(body) <> ''
      AND btrim(person_name) <> ''
      AND btrim(person_role) <> ''
      AND btrim(company) <> ''
    )
);

CREATE INDEX idx_sfa_outcome_cards_order
  ON sfa_outcome_cards (display_order, created_at);
CREATE INDEX idx_sfa_outcome_cards_status ON sfa_outcome_cards (status);

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX idx_sfa_outcome_cards_photo_file
  ON sfa_outcome_cards (photo_file_id)
  WHERE photo_file_id IS NOT NULL;

CREATE TRIGGER sfa_outcome_section_set_updated_at
  BEFORE UPDATE ON sfa_outcome_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sfa_outcome_cards_set_updated_at
  BEFORE UPDATE ON sfa_outcome_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
