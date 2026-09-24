-- FMS product page CMS: "It's Not Just Software - It's Your Franchise
-- Operating System."
--
-- Copy over a product video, with the playback bar underneath. The same shape
-- as the SFA-DMS page's video section, because it is the same component
-- rendering the same thing: the copy lives once in page_section_copy under
-- ('fms', 'video'), and this table holds the video.
--
-- A list rather than a singleton, and one row is live at a time. That is what
-- lets a replacement video be uploaded and checked alongside the one visitors
-- are watching, then switched over with the status toggle - rather than being
-- written over the top of it.
--
-- Its own table rather than a page column on sfa_video_entries: the two pages
-- show different films to different audiences, and the day one is re-cut the
-- other should not move.
--
-- The section key 'video' is already allowed - the SFA-DMS page uses it - so
-- no check widens here.

CREATE TABLE fms_video_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * The product video, from one of two mutually exclusive sources.
   *
   * A URL is the practical choice for anything large - a CDN serves range
   * requests and this API does not - while an upload keeps a short clip inside
   * the panel with everything else.
   */
  video_url       VARCHAR(1000),
  video_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_video_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_video_entries_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT fms_video_entries_single_video_source_check
    CHECK (video_url IS NULL OR video_file_id IS NULL),
  /*
   * A video is required, unlike the optional artwork elsewhere.
   *
   * The section is a video showcase - the copy above reads as an introduction
   * to it - so an entry with no video is an empty black box under a heading
   * that promises one.
   */
  CONSTRAINT fms_video_entries_video_required_check
    CHECK (video_url IS NOT NULL OR video_file_id IS NOT NULL)
);

/*
 * One entry live at a time - the section renders a single player, so a second
 * active row would be silently invisible.
 *
 * A partial unique index rather than only a check in the service: two
 * administrators activating different entries at the same moment would each
 * see no other active row and both commit.
 */
CREATE UNIQUE INDEX fms_video_entries_one_active_idx
  ON fms_video_entries ((status))
  WHERE status = 'ACTIVE';

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX fms_video_entries_published_idx
  ON fms_video_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX fms_video_entries_video_file_idx
  ON fms_video_entries (video_file_id)
  WHERE video_file_id IS NOT NULL;

CREATE TRIGGER fms_video_entries_set_updated_at
  BEFORE UPDATE ON fms_video_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
