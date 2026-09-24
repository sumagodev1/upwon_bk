-- Home page CMS: frequently asked questions.
--
-- One table per section, one row per question - the same shape as the hero's
-- slides, the trust entries, the industries entries, the values cards, the
-- integration logos and the testimonials, so the admin screen, the validation
-- and the routes are all the ones already in place.
--
-- The section copy repeats on every row and the public read takes it from the
-- first active question, the same arrangement as the other list sections.
--
-- No media columns here, unlike every other section: the accordion is text
-- only, so there is nothing to upload and no files(id) reference to keep.

CREATE TABLE home_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section copy. Repeated per row; the public read uses the first active one.
  eyebrow         VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as the other sections' headings:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading         TEXT          NOT NULL,

  subtext         TEXT          NOT NULL,

  -- The question, as the accordion row reads it.
  question        VARCHAR(300)  NOT NULL,

  -- The answer, revealed when the row is opened. Plain text: the component
  -- renders it into a <p>, so markup would be shown literally rather than
  -- interpreted, and the heading grammar deliberately does not apply here.
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_faq_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_faq_entries_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
      AND btrim(question) <> '' AND btrim(answer) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_faq_entries_published_idx
  ON home_faq_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER home_faq_entries_set_updated_at
  BEFORE UPDATE ON home_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
