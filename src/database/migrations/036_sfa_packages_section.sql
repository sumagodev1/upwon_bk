-- SFA-DMS product page CMS: "Start With Your Field Team. Add Distributor
-- Control When You're Ready."
--
-- The phased adoption path, drawn as pricing-table cards with no prices: one
-- card per stage, each listing what it adds to the stage before it.
--
-- Two tables, because a card and its ticks are edited at different moments -
-- the pitch is rewritten rarely, a capability is added to the list the week it
-- ships. The features cascade with their card: a tick list has no meaning
-- without the package it belongs to.
--
-- The eyebrow, heading and subtext above the cards live once in
-- page_section_copy under ('sfa-dms', 'packages').

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
      'proof', 'video', 'packages'
    ));

-- ── the cards ─────────────────────────────────────────────────────────────

CREATE TABLE sfa_package_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  -- The pill in the top-right corner: 'Stage 1', 'Stage 2', 'Complete'.
  stage_label       VARCHAR(40)   NOT NULL,
  title             VARCHAR(120)  NOT NULL,
  -- The coloured line under the title, e.g. 'For Your Field Team'.
  subtitle          VARCHAR(160)  NOT NULL,
  description       TEXT          NOT NULL,

  /*
   * The card's accent, as #RRGGBB.
   *
   * One colour, not two: the icon's tint is this at ten percent alpha and the
   * badge border is this at twenty, both computed on the site. Storing the
   * derived values as well would only be two more ways for them to disagree.
   */
  accent_color      CHAR(7)       NOT NULL,

  /*
   * The button. Required, unlike the optional buttons elsewhere: these are
   * offer cards, and one with no way to act on it is a dead end rather than a
   * quieter variation.
   */
  button_label      VARCHAR(120)  NOT NULL,
  button_href       VARCHAR(500)  NOT NULL,

  -- The small caps line over the ticks: 'Key features', 'Everything in SFA, plus'.
  features_label    VARCHAR(120)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_package_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_package_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT sfa_package_cards_accent_color_check
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT sfa_package_cards_not_blank_check
    CHECK (
      btrim(icon) <> ''
      AND btrim(stage_label) <> ''
      AND btrim(title) <> ''
      AND btrim(subtitle) <> ''
      AND btrim(description) <> ''
      AND btrim(button_label) <> ''
      AND btrim(button_href) <> ''
      AND btrim(features_label) <> ''
    )
);

CREATE INDEX idx_sfa_package_cards_order ON sfa_package_cards (display_order, created_at);
CREATE INDEX idx_sfa_package_cards_status ON sfa_package_cards (status);

-- ── the ticks under each card ─────────────────────────────────────────────

CREATE TABLE sfa_package_features (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a tick list has no meaning without the package it belongs to.
  card_id           UUID          NOT NULL REFERENCES sfa_package_cards(id) ON DELETE CASCADE,

  label             VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_package_features_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_package_features_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT sfa_package_features_label_check
    CHECK (btrim(label) <> '')
);

-- The read path: a card's ticks, in order.
CREATE INDEX idx_sfa_package_features_card
  ON sfa_package_features (card_id, display_order, created_at);
CREATE INDEX idx_sfa_package_features_status ON sfa_package_features (status);

CREATE TRIGGER sfa_package_cards_set_updated_at
  BEFORE UPDATE ON sfa_package_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sfa_package_features_set_updated_at
  BEFORE UPDATE ON sfa_package_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
