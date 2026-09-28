-- Spices & Agro Processing industry page CMS: the FAQ.
--
-- "Questions Processing Teams Ask Before They Switch." The same shape as the
-- other industry pages' FAQs (053, 060) - a list of questions.
--
-- The copy that heads the accordion lives in page_section_copy under
-- ('spices-agro', 'faq'). Both keys are already allowed, so no check widens
-- here.

CREATE TABLE spices_agro_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT spices_agro_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT spices_agro_faq_entries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT spices_agro_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_spices_agro_faq_entries_order
  ON spices_agro_faq_entries (display_order, created_at);
CREATE INDEX idx_spices_agro_faq_entries_status ON spices_agro_faq_entries (status);

CREATE TRIGGER spices_agro_faq_entries_set_updated_at
  BEFORE UPDATE ON spices_agro_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
