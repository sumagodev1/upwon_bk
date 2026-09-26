-- Soft delete for the Bakery & Confectionery page's lists.
--
-- A delete from the admin stamps deleted_at instead of removing the row, so the
-- record stays in the table for audit and recovery. Every read and write the
-- page makes filters on deleted_at IS NULL: a deleted row is gone from the
-- admin lists, search, the caps, the duplicate checks, reorders and the public
-- API, but not from the database.
--
-- deleted_at rather than an is_deleted flag, the same column the files table
-- already uses - the timestamp answers "when" as well as "whether".
--
-- The closing band (bakery_cta_section) is a single record that is replaced,
-- never deleted, so it has no column.

ALTER TABLE bakery_hero_slides    ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bakery_trust_logos    ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bakery_trust_stats    ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bakery_platform_tiles ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bakery_help_visuals   ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bakery_faq_entries    ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE bakery_cta_features   ADD COLUMN deleted_at TIMESTAMPTZ;

/*
 * One live diagram at a time now means one live *undeleted* diagram: a row
 * deleted while it was ACTIVE keeps its status for the record, and must not
 * block the next one from going live.
 */
DROP INDEX bakery_help_visuals_one_active_idx;

CREATE UNIQUE INDEX bakery_help_visuals_one_active_idx
  ON bakery_help_visuals ((status))
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- The public read path of every list: live rows, in display order.
CREATE INDEX idx_bakery_hero_slides_live
  ON bakery_hero_slides (display_order, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_bakery_trust_logos_live
  ON bakery_trust_logos (display_order, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_bakery_trust_stats_live
  ON bakery_trust_stats (display_order, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_bakery_platform_tiles_live
  ON bakery_platform_tiles (display_order, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_bakery_help_visuals_live
  ON bakery_help_visuals (display_order, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_bakery_faq_entries_live
  ON bakery_faq_entries (display_order, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_bakery_cta_features_live
  ON bakery_cta_features (display_order, created_at) WHERE deleted_at IS NULL;
