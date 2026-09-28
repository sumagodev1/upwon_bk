-- Beverages & Juices industry page CMS: the FAQ.
--
-- "Questions Beverage Teams Ask Before They Switch." The same shape as the
-- Engineering page's FAQ (053) - a list of questions.
--
-- The copy that heads the accordion lives in page_section_copy under
-- ('beverage', 'faq'). Both keys are already allowed, so no check widens here.

CREATE TABLE beverage_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_faq_entries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_beverage_faq_entries_order
  ON beverage_faq_entries (display_order, created_at);
CREATE INDEX idx_beverage_faq_entries_status ON beverage_faq_entries (status);

CREATE TRIGGER beverage_faq_entries_set_updated_at
  BEFORE UPDATE ON beverage_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
