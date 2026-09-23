-- Home page CMS: industries video intro.
--
-- One table per section, one row per entry - the same shape as the hero's
-- slides and the trust section's entries, so the admin screen, the validation
-- and the routes are all the ones already in place.
--
-- The section renders a single block, so in practice one row is active at a
-- time; the public read takes the first active entry. Keeping it a list rather
-- than a singleton means an alternate heading or a replacement video can be
-- authored alongside the live one and switched over with the status toggle,
-- instead of being edited in place over the top of what visitors are seeing.

CREATE TABLE home_industries_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Small orange line above the heading, e.g. 'Industries We Serve'.
  eyebrow         VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as the hero and trust headings:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading         TEXT          NOT NULL,

  subtext         TEXT          NOT NULL,

  /*
   * The product video, from one of two mutually exclusive sources.
   *
   * A URL is the practical choice for anything large - a CDN serves range
   * requests and this API does not - while an upload keeps a short clip inside
   * the panel with everything else. Same pair, and the same "exactly one"
   * rule, as the hero's image.
   */
  video_url       VARCHAR(1000),
  video_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_industries_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_industries_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_industries_entries_single_video_source_check
    CHECK (video_url IS NULL OR video_file_id IS NULL),

  /*
   * A video is required, unlike the hero's optional image.
   *
   * The section is a video showcase - the copy sits above the player and reads
   * as an introduction to it. An entry with no video is an empty black box
   * under a heading that promises one.
   */
  CONSTRAINT home_industries_entries_video_required_check
    CHECK (video_url IS NOT NULL OR video_file_id IS NOT NULL),

  CONSTRAINT home_industries_entries_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_industries_entries_published_idx
  ON home_industries_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX home_industries_entries_video_file_idx
  ON home_industries_entries (video_file_id)
  WHERE video_file_id IS NOT NULL;

CREATE TRIGGER home_industries_entries_set_updated_at
  BEFORE UPDATE ON home_industries_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
