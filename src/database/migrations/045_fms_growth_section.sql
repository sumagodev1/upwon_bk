-- FMS product page CMS: "Start With Your Counter. Grow Into Full Franchise
-- Control."
--
-- Three tier cards shown as pricing-style plans - CORE, PRO, PLUS - with a
-- reassurance line under the row. Three tables:
--
--   fms_growth_section   the reassurance line, one record
--   fms_growth_tiers     the cards
--   fms_growth_features  the ticks under each, cascading from their tier
--
-- Shaped like the SFA-DMS page's adoption path, with two differences the
-- design forces. There is no per-card accent here: every card is drawn in the
-- brand orange and the highlighted one is distinguished by a badge instead, so
-- an accent column would be a colour nothing reads. And a tier carries an
-- `is_popular` flag, which that section has no equivalent of.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('fms', 'packages'). That section key is already allowed - the SFA-DMS page
-- uses it - so no check widens here.

-- -- the reassurance line ---------------------------------------------------

CREATE TABLE fms_growth_section (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What an upsert conflicts on, so the first save creates the row and every
  -- later save replaces it.
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  /*
   * The line under the row of cards: "No setup fees - Free data migration -
   * Dedicated onboarding - Phased, outlet-by-outlet rollout".
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

  CONSTRAINT fms_growth_section_singleton_check
    CHECK (singleton = TRUE),
  -- Absent is how the line is turned off; blank is a row that renders as an
  -- empty gap under the cards, so it is rejected rather than stored.
  CONSTRAINT fms_growth_section_footnote_check
    CHECK (footnote IS NULL OR btrim(footnote) <> '')
);

CREATE TRIGGER fms_growth_section_set_updated_at
  BEFORE UPDATE ON fms_growth_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- the tier cards ---------------------------------------------------------

CREATE TABLE fms_growth_tiers (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps label at the top of the card: CORE, PRO, PLUS.
  name              VARCHAR(40)   NOT NULL,
  -- Stable across renames, so a deep link keeps pointing at the same tier.
  slug              VARCHAR(80)   NOT NULL UNIQUE,
  -- The large line where a price would be, which today reads "Talk to us".
  lead              VARCHAR(120)  NOT NULL,
  -- The line under it: "Run outlet operations digitally".
  tagline           VARCHAR(200)  NOT NULL,
  -- The bordered pill: "Outlet billing -> operations".
  scope             VARCHAR(160)  NOT NULL,

  /*
   * The bold first tick: "Everything in Core, plus:". Null on the entry-level
   * tier, which has no tier beneath it to build on - so this is nullable
   * rather than a blank string, because "no such line" is not "an empty line".
   */
  inherits_label    VARCHAR(160),

  /*
   * The button. Required, unlike the optional buttons elsewhere: these are
   * offer cards, and one with no way to act on it is a dead end rather than a
   * quieter variation.
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

  CONSTRAINT fms_growth_tiers_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_growth_tiers_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_growth_tiers_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT fms_growth_tiers_inherits_label_check
    CHECK (inherits_label IS NULL OR btrim(inherits_label) <> ''),
  CONSTRAINT fms_growth_tiers_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(lead) <> '' AND btrim(tagline) <> ''
      AND btrim(scope) <> '' AND btrim(button_label) <> '' AND btrim(button_href) <> ''
    )
);

/*
 * One highlighted card at a time - the badge is centred on a single card, and
 * two would read as no recommendation at all.
 *
 * A partial unique index rather than only a check in the service: two
 * administrators promoting different tiers at the same moment would each see
 * no other popular row and both commit.
 */
CREATE UNIQUE INDEX fms_growth_tiers_one_popular_idx
  ON fms_growth_tiers ((is_popular))
  WHERE is_popular = TRUE;

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX fms_growth_tiers_published_idx
  ON fms_growth_tiers (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER fms_growth_tiers_set_updated_at
  BEFORE UPDATE ON fms_growth_tiers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- the ticks under each card ----------------------------------------------

CREATE TABLE fms_growth_features (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a tick list has no meaning without the tier it belongs to.
  tier_id           UUID          NOT NULL
                                  REFERENCES fms_growth_tiers(id) ON DELETE CASCADE,

  label             VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_growth_features_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_growth_features_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_growth_features_label_check
    CHECK (btrim(label) <> '')
);

-- Covers both the admin list (one tier's ticks, in order) and the public read
-- (the active ones), which are the only two queries.
CREATE INDEX fms_growth_features_by_tier_idx
  ON fms_growth_features (tier_id, display_order, created_at);

CREATE TRIGGER fms_growth_features_set_updated_at
  BEFORE UPDATE ON fms_growth_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
