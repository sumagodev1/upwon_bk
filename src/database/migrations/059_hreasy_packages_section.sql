-- HREasy product page CMS: "Start With Core HR. Grow Into Full Performance
-- Management."
--
-- Three tier cards laid out like a pricing table, the middle one highlighted.
-- The same two tables the POS and FMS pages carry for their growth paths,
-- because it is the same design, and the column names are theirs too - each
-- one names the same visual slot on every page:
--
--   name            the small caps label       ("Core")
--   lead            the card's prominent line  ("Core HR & Payroll")
--   tagline         the line under it          ("Everything a growing team needs…")
--   scope           the bordered pill          ("1 company")
--   inherits_label  the label above the ticks  ("Everything in Core, plus…")
--
-- An editor who has learned one page's form has learned this one.
--
-- Two tables, not the POS page's three: that section carries a growth-path
-- line under the row and this one does not, so there is no singleton to hold
-- it. If the line is ever wanted here it is one more table, not a column.
--
-- The eyebrow, heading and subtext above the row live once in
-- page_section_copy under ('hreasy', 'packages'). That section key is already
-- allowed - the SFA-DMS, FMS and POS pages use it - so no check widens here.

-- ── the tier cards ────────────────────────────────────────────────────────

CREATE TABLE hreasy_package_tiers (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps label at the top of the card: CORE, PRO, PLUS.
  name              VARCHAR(40)   NOT NULL,
  -- Stable across renames, so a deep link keeps pointing at the same tier.
  slug              VARCHAR(80)   NOT NULL UNIQUE,
  -- The card's prominent line: "Core HR & Payroll".
  lead              VARCHAR(120)  NOT NULL,
  -- The line under it: "Everything a growing team needs to run HR & payroll right."
  tagline           VARCHAR(200)  NOT NULL,
  -- The bordered pill: "Up to 5 companies".
  scope             VARCHAR(160)  NOT NULL,

  /*
   * The italic label above the tick list: "Everything in Core, plus…".
   *
   * Nullable, as on the other pages: the entry tier has nothing beneath it,
   * so it has no inheritance to name. Core leaves it empty here.
   */
  inherits_label    VARCHAR(160),

  /*
   * The button. Required: these are offer cards, and one with no way to act
   * on it is a dead end rather than a quieter variation.
   */
  button_label      VARCHAR(120)  NOT NULL,
  button_href       VARCHAR(500)  NOT NULL,

  /*
   * Which of the three button treatments the card wears.
   *
   * A name rather than colours, for the reason every other enum on these
   * pages is one: the site draws them with Tailwind classes that have to
   * exist in its source at build time, so a colour from here would name a
   * class nobody generated and the button would render unstyled.
   *
   * Not derived from is_popular either - the two unhighlighted cards differ
   * from each other today (Core is outlined in orange, Plus in navy), so one
   * boolean cannot say which treatment a card takes.
   */
  button_style      VARCHAR(20)   NOT NULL DEFAULT 'OUTLINE_NAVY',

  /*
   * The highlighted card - the one wearing the "Most Popular" badge, the
   * orange border and the washed header. At most one, which the partial
   * unique index below enforces.
   */
  is_popular        BOOLEAN       NOT NULL DEFAULT FALSE,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_package_tiers_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_package_tiers_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT hreasy_package_tiers_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT hreasy_package_tiers_button_style_check
    CHECK (button_style IN ('FILLED', 'OUTLINE_ACCENT', 'OUTLINE_NAVY')),
  -- Absent is how the label is turned off; blank is a row that renders as an
  -- empty gap above the ticks, so it is rejected rather than stored.
  CONSTRAINT hreasy_package_tiers_inherits_label_check
    CHECK (inherits_label IS NULL OR btrim(inherits_label) <> ''),
  CONSTRAINT hreasy_package_tiers_not_blank_check
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
CREATE UNIQUE INDEX hreasy_package_tiers_one_popular_idx
  ON hreasy_package_tiers ((is_popular))
  WHERE is_popular = TRUE;

CREATE INDEX idx_hreasy_package_tiers_order
  ON hreasy_package_tiers (display_order, created_at);
CREATE INDEX idx_hreasy_package_tiers_status ON hreasy_package_tiers (status);

-- ── the tick lists ────────────────────────────────────────────────────────

CREATE TABLE hreasy_package_features (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a tick has no meaning without the tier it belongs to.
  tier_id           UUID          NOT NULL
                                  REFERENCES hreasy_package_tiers(id) ON DELETE CASCADE,

  label             VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_package_features_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_package_features_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT hreasy_package_features_label_check
    CHECK (btrim(label) <> '')
);

CREATE INDEX idx_hreasy_package_features_tier
  ON hreasy_package_features (tier_id, display_order, created_at);
CREATE INDEX idx_hreasy_package_features_status ON hreasy_package_features (status);

CREATE TRIGGER hreasy_package_tiers_set_updated_at
  BEFORE UPDATE ON hreasy_package_tiers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER hreasy_package_features_set_updated_at
  BEFORE UPDATE ON hreasy_package_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
