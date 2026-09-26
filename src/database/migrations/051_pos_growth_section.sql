-- POS product page CMS: "Start With Billing. Grow Into Your Full Kitchen and
-- Stock."
--
-- Three tier cards laid out like a pricing table, the middle one highlighted,
-- with a growth-path line underneath. The same three tables as the FMS page's
-- equivalent, because it is the same design: a singleton for the line under
-- the row, the tiers, and the tick list belonging to each.
--
-- The column names are the FMS page's too, and deliberately so - each one
-- names the same visual slot on both pages:
--
--   lead            the card's prominent line  ("Essential counter billing")
--   tagline         the line under it          ("Single outlet or up to 10 counters")
--   scope           the bordered pill          ("Up to 10 counters")
--   inherits_label  the label above the ticks  ("Everything in Core, plus")
--
-- An editor who has learned one page's form has learned the other's.
--
-- The eyebrow, heading and subtext above the row live once in
-- page_section_copy under ('pos', 'packages'). That key is what the other
-- product pages use for their tier rows, and it already passes its check.

-- ── the line under the row ────────────────────────────────────────────────

CREATE TABLE pos_growth_section (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What an upsert conflicts on, so the first save creates the row and every
  -- later save replaces it.
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  /*
   * The growth-path line under the cards: "Start with Core today. Move to
   * Plus - or into full UpWon ERP - without re-entering a single record."
   *
   * Unlike the FMS page's, this line is drawn with an orange half. So it is
   * authored in the same grammar the headings use - **like this** for the
   * accent - and parsed server-side into footnoteLines. Storing the raw text
   * keeps the markers editable; the parse happens on the way out.
   *
   * Optional. The row of cards reads perfectly well without it, and an editor
   * who wants it gone should be able to clear it rather than having to invent
   * a replacement.
   */
  footnote          TEXT,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_growth_section_singleton_check
    CHECK (singleton = TRUE),
  -- Absent is how the line is turned off; blank is a row that renders as an
  -- empty gap under the cards, so it is rejected rather than stored.
  CONSTRAINT pos_growth_section_footnote_check
    CHECK (footnote IS NULL OR btrim(footnote) <> '')
);

-- ── the tiers ─────────────────────────────────────────────────────────────

CREATE TABLE pos_growth_tiers (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps label at the top of the card: CORE, PRO, PLUS.
  name              VARCHAR(40)   NOT NULL,
  -- Stable across renames, so a deep link keeps pointing at the same tier.
  slug              VARCHAR(80)   NOT NULL UNIQUE,
  -- The card's prominent line: "Essential counter billing".
  lead              VARCHAR(120)  NOT NULL,
  -- The line under it: "Single outlet or up to 10 counters".
  tagline           VARCHAR(200)  NOT NULL,
  -- The bordered pill: "Up to 10 counters".
  scope             VARCHAR(160)  NOT NULL,

  /*
   * The label above the tick list: "Everything in Core, plus".
   *
   * Nullable, as on the FMS page, because a tier with nothing beneath it has
   * no inheritance to name. This page happens to fill it on every card - the
   * entry tier reads "Includes" - but that is content, not a schema rule, and
   * an editor should be able to drop the label without inventing a phrase.
   */
  inherits_label    VARCHAR(160),

  /*
   * The button. Required, unlike the optional buttons elsewhere: these are
   * offer cards, and one with no way to act on it is a dead end rather than a
   * quieter variation. The page ships "Talk to us" pointing at /demo on all
   * three, stored per tier so one of them can differ later.
   */
  button_label      VARCHAR(120)  NOT NULL,
  button_href       VARCHAR(500)  NOT NULL,

  /*
   * The highlighted card - the one wearing the "Most Popular" badge and the
   * filled button. At most one, which the partial unique index below enforces.
   */
  is_popular        BOOLEAN       NOT NULL DEFAULT FALSE,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_growth_tiers_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_growth_tiers_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_growth_tiers_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT pos_growth_tiers_inherits_label_check
    CHECK (inherits_label IS NULL OR btrim(inherits_label) <> ''),
  CONSTRAINT pos_growth_tiers_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(lead) <> '' AND btrim(tagline) <> ''
      AND btrim(scope) <> '' AND btrim(button_label) <> '' AND btrim(button_href) <> ''
    )
);

/*
 * One highlighted card at a time - the design has a single "Most Popular"
 * badge, so a second would read as a mistake to a visitor comparing them.
 *
 * A partial unique index rather than only a check in the service: two
 * administrators promoting different tiers at the same moment would each see
 * no other popular row and both commit.
 */
CREATE UNIQUE INDEX pos_growth_tiers_one_popular_idx
  ON pos_growth_tiers ((is_popular))
  WHERE is_popular = TRUE;

CREATE INDEX idx_pos_growth_tiers_order ON pos_growth_tiers (display_order, created_at);
CREATE INDEX idx_pos_growth_tiers_status ON pos_growth_tiers (status);

-- ── the tick lists ────────────────────────────────────────────────────────

CREATE TABLE pos_growth_features (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a tick list has no meaning without the tier it belongs to.
  tier_id           UUID          NOT NULL
                                  REFERENCES pos_growth_tiers(id) ON DELETE CASCADE,

  label             VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_growth_features_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_growth_features_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_growth_features_label_check
    CHECK (btrim(label) <> '')
);

CREATE INDEX idx_pos_growth_features_tier
  ON pos_growth_features (tier_id, display_order, created_at);
CREATE INDEX idx_pos_growth_features_status ON pos_growth_features (status);

CREATE TRIGGER pos_growth_section_set_updated_at
  BEFORE UPDATE ON pos_growth_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_growth_tiers_set_updated_at
  BEFORE UPDATE ON pos_growth_tiers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_growth_features_set_updated_at
  BEFORE UPDATE ON pos_growth_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
