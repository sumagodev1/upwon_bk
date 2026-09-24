-- ERP product page CMS: "What Changed After UPWON - In Their Own Words".
--
-- A carousel of outcome cards. Each card is one customer's result: a pill
-- naming their industry, the figure that changed, the line explaining it, the
-- quote, who said it, and a photograph down the right-hand side.
--
-- The eyebrow and heading above the carousel live once in page_section_copy
-- under ('erp', 'outcomes').

-- ── let a section's copy have no subtext ──────────────────────────────────
--
-- Most sections carry one, so the column was written NOT NULL. This one does
-- not: the header row is an eyebrow, a heading and a button, with the cards
-- doing the explaining. Inventing a sentence to satisfy the column would put a
-- paragraph into a design that deliberately has none.
--
-- The heading stays required. A section with no heading is not authored, which
-- is what a missing row already means.

ALTER TABLE page_section_copy ALTER COLUMN subtext DROP NOT NULL;

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_not_blank_check;

-- Absent is NULL, never an empty string, so there is one way to represent
-- "no eyebrow" or "no subtext" rather than two that render the same.
ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_not_blank_check
    CHECK (
      (eyebrow IS NULL OR btrim(eyebrow) <> '')
      AND btrim(heading) <> ''
      AND (subtext IS NULL OR btrim(subtext) <> '')
    );

-- ── the outcome cards ─────────────────────────────────────────────────────

CREATE TABLE erp_outcome_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The pill at the top left of the card.
  industry          VARCHAR(120)  NOT NULL,

  -- The figure, written exactly as it should read: these are values like
  -- "6 tools -> 1" and "Same-day" that carry their own punctuation, so the
  -- site prints them rather than formatting a number it was handed.
  stat              VARCHAR(60)   NOT NULL,
  -- The line under the figure, saying what it counts.
  stat_label        VARCHAR(255)  NOT NULL,

  -- Stored without its quotation marks; the card draws those, so an editor
  -- pasting a quote with them would otherwise get two sets.
  quote             TEXT          NOT NULL,

  -- Who said it. A designation and a company, not a person's name - that is
  -- what the card shows.
  author_role       VARCHAR(160)  NOT NULL,
  author_company    VARCHAR(160)  NOT NULL,

  -- The photograph, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  image_alt         VARCHAR(255),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT erp_outcome_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_outcome_cards_single_image_source_check
    CHECK (num_nonnulls(image_url, image_file_id) <= 1),
  -- A card is built around its photograph, so one is required - unlike the
  -- optional wordmarks elsewhere on this page.
  CONSTRAINT erp_outcome_cards_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT erp_outcome_cards_industry_check
    CHECK (length(btrim(industry)) > 0),
  CONSTRAINT erp_outcome_cards_stat_check
    CHECK (length(btrim(stat)) > 0),
  CONSTRAINT erp_outcome_cards_stat_label_check
    CHECK (length(btrim(stat_label)) > 0),
  CONSTRAINT erp_outcome_cards_quote_check
    CHECK (length(btrim(quote)) > 0),
  CONSTRAINT erp_outcome_cards_role_check
    CHECK (length(btrim(author_role)) > 0),
  CONSTRAINT erp_outcome_cards_company_check
    CHECK (length(btrim(author_company)) > 0)
);

CREATE INDEX idx_erp_outcome_cards_order
  ON erp_outcome_cards (display_order, created_at);
CREATE INDEX idx_erp_outcome_cards_status
  ON erp_outcome_cards (status);
