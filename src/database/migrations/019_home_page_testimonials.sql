-- Home page CMS: client video testimonials.
--
-- One table per section, one row per testimonial card - the same shape as the
-- hero's slides, the trust entries, the industries entries, the values cards
-- and the integration logos, so the admin screen, the validation and the
-- routes are all the ones already in place.
--
-- The section copy repeats on every row and the public read takes it from the
-- first active card, the same arrangement as the trust, values and
-- integrations sections.

CREATE TABLE home_testimonial_entries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section copy. Repeated per row; the public read uses the first active one.
  eyebrow           VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as the other sections' headings:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading           TEXT          NOT NULL,

  subtext           TEXT          NOT NULL,

  -- The card's still image, from one of two mutually exclusive sources.
  --
  -- Required, and separate from the video below, because the still is what the
  -- marquee actually renders: the clip only loads once a visitor opens the
  -- modal. A card without one is a broken <img> in a scrolling row, and
  -- rendering sixteen <video> elements instead so the first frame could stand
  -- in would cost a metadata request each.
  poster_url        VARCHAR(1000),
  poster_file_id    UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The clip the play button opens. Optional: the component already handles a
  -- card with no video by dropping the play button and offering the customer
  -- story instead, which is the honest state for a testimonial still being
  -- filmed.
  video_url         VARCHAR(1000),
  video_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- What the customer said, and who said it.
  quote             TEXT          NOT NULL,
  client_name       VARCHAR(160)  NOT NULL,
  -- Role and sector as one authored line, e.g. 'Retail Operations - Sweets'.
  client_position   VARCHAR(200)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_testimonial_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_testimonial_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_testimonial_entries_single_poster_source_check
    CHECK (poster_url IS NULL OR poster_file_id IS NULL),

  CONSTRAINT home_testimonial_entries_poster_required_check
    CHECK (poster_url IS NOT NULL OR poster_file_id IS NOT NULL),

  CONSTRAINT home_testimonial_entries_single_video_source_check
    CHECK (video_url IS NULL OR video_file_id IS NULL),

  CONSTRAINT home_testimonial_entries_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
      AND btrim(quote) <> '' AND btrim(client_name) <> ''
      AND btrim(client_position) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_testimonial_entries_published_idx
  ON home_testimonial_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
-- Two indexes rather than one on both columns: they are read one at a time.
CREATE INDEX home_testimonial_entries_poster_file_idx
  ON home_testimonial_entries (poster_file_id)
  WHERE poster_file_id IS NOT NULL;

CREATE INDEX home_testimonial_entries_video_file_idx
  ON home_testimonial_entries (video_file_id)
  WHERE video_file_id IS NOT NULL;

CREATE TRIGGER home_testimonial_entries_set_updated_at
  BEFORE UPDATE ON home_testimonial_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
