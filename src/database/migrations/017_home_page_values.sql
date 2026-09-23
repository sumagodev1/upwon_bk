-- Home page CMS: values and work culture.
--
-- One table per section, one row per card - the same shape as the hero's
-- slides, the trust entries and the industries entries, so the admin screen,
-- the validation and the routes are all the ones already in place.
--
-- The section copy repeats on every row and the public read takes it from the
-- first active card, the same arrangement as the trust section. That is the
-- cost of one row carrying everything; the alternative is a second table for
-- three fields, which is what the trust section was moved away from.

CREATE TABLE home_values_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section copy. Repeated per row; the public read uses the first active one.
  eyebrow         VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as the other sections' headings:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading         TEXT          NOT NULL,

  subtext         TEXT          NOT NULL,

  -- The card's photo, from one of two mutually exclusive sources. Required:
  -- the card is a photo above its copy, so one without an image is a gap in
  -- an otherwise even grid.
  image_url       VARCHAR(1000),
  image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The value's name and its one-paragraph explanation.
  card_title      VARCHAR(160)  NOT NULL,
  card_body       TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_values_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_values_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_values_entries_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT home_values_entries_image_required_check
    CHECK (image_url IS NOT NULL OR image_file_id IS NOT NULL),

  CONSTRAINT home_values_entries_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
      AND btrim(card_title) <> '' AND btrim(card_body) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_values_entries_published_idx
  ON home_values_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX home_values_entries_image_file_idx
  ON home_values_entries (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER home_values_entries_set_updated_at
  BEFORE UPDATE ON home_values_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
