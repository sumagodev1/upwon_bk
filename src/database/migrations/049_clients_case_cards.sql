-- Clients page CMS: "What Growth Actually Looks Like on UpWon."
--
-- The featured case studies under the Clients hero: a grid of cards, each one
-- named client's result - the industry, the brand, where and at what scale it
-- runs, a one-line quote, up to three outcome figures, and a link to the full
-- story.
--
-- The eyebrow, heading and subtext above the grid live once in
-- page_section_copy under ('clients', 'outcomes') - which is why that table's
-- page-key check widens first. 'outcomes' is already an allowed section key.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN (
    -- Merge union: three branches each re-declared this list with only their
    -- own pages, so the last to run erased the rest. Every key the codebase
    -- declares is listed here - see PAGE_SECTION_KEYS in src/config/constants.ts.
      'home', 'erp', 'sfa-dms', 'fms', 'pos', 'hreasy', 'wms', 'vms', 'bakery', 'fmcg',
      'sweets', 'food-processing', 'non-food-fmcg', 'dairy', 'engineering-manufacturing',
      'beverage', 'spices-agro', 'qsr-franchise', 'why-upwon', 'clients'
    ));

-- ── the case cards ────────────────────────────────────────────────────────

CREATE TABLE clients_case_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small orange label at the top of the card ('Bakery & Confectionery').
  category          VARCHAR(120)  NOT NULL,
  -- The client's name, the card's title.
  brand             VARCHAR(120)  NOT NULL,
  -- The pinned line under the title: location, then the optional scale
  -- ('16 Plants · 200+ Outlets · 5,000+ Orders/Day'), joined with a dot.
  location          VARCHAR(120)  NOT NULL,
  scale             VARCHAR(300),

  -- Stored without its quotation marks; the card draws those.
  headline          TEXT          NOT NULL,

  -- The figures along the bottom of the card: an ordered array of
  -- { "value": "35 → 200+", "label": "Scaled without adding back-office staff" }.
  -- jsonb rather than a child table because the figures have no status, order
  -- or identity of their own - they are edited with the card, in one form. The
  -- shape and the 1..3 count are enforced by the validator; the CHECK below
  -- only guarantees it is an array.
  outcomes          JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- Where 'Read the full story' goes: a site-relative path ('/clients/monginis')
  -- or an absolute URL. NULL hides the link.
  story_url         VARCHAR(500),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_case_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_case_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT clients_case_cards_outcomes_array_check
    CHECK (jsonb_typeof(outcomes) = 'array'),
  CONSTRAINT clients_case_cards_copy_not_blank_check
    CHECK (
      btrim(category) <> ''
      AND btrim(brand) <> ''
      AND btrim(location) <> ''
      AND btrim(headline) <> ''
      AND (scale IS NULL OR btrim(scale) <> '')
      AND (story_url IS NULL OR btrim(story_url) <> '')
    )
);

-- The public read path: ACTIVE rows in display order.
CREATE INDEX clients_case_cards_published_idx
  ON clients_case_cards (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER clients_case_cards_set_updated_at
  BEFORE UPDATE ON clients_case_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
