-- WMS product page CMS: "Everything From the Receiving Dock to the Dispatch
-- Bay - In One Flow."
--
-- A stack of capability bands under one heading. Each band is a heading and a
-- paragraph on one side and that capability's artwork on the other, the sides
-- alternating down the page. Seven bands today, from receiving to dispatch.
--
-- One table, because a band is one thing: a name, a paragraph and a picture.
--
-- Unlike hreasy_capability_modules this keeps `title` and `description` as
-- columns. 057 dropped that pair over there on the finding that the panel's
-- heading and line were baked into the artwork, so columns for them were a
-- second copy of the same words. Here they are not: the heading and the
-- paragraph are rendered text beside the image, selectable and searchable,
-- and the words inside the artwork are a different, shorter caption. So both
-- genuinely are data on this page.
--
-- No slug either, for the same kind of reason. HREasy's list is a switcher
-- and needs a key its selected row survives a rename by; this stack is read
-- top to bottom with nothing selectable in it.
--
-- The eyebrow, heading and subtext above the stack live once in
-- page_section_copy under ('wms', 'capabilities'). Both halves of that key
-- already pass their checks - 'wms' was widened in by 062, and 'capabilities'
-- by 056 for the HREasy page - so no constraint widens here.

CREATE TABLE wms_capability_modules (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The band's heading: "Picking & Packing".
  title             VARCHAR(160)  NOT NULL,
  /*
   * The paragraph under it.
   *
   * TEXT rather than the bounded column the warehouse-type cards carry. Those
   * sit in a grid where every card is the height of its tallest neighbour, so
   * one long line pushes a whole row taller. These are full-width bands
   * stacked down the page - a longer paragraph makes its own band taller and
   * touches nothing else. The authoring limit lives in the validator.
   */
  description       TEXT          NOT NULL,

  /*
   * The artwork beside the text, from one of two mutually exclusive sources,
   * and required: the band is half picture, so one without it is a paragraph
   * with a hole next to it.
   *
   * One image, not a desktop/mobile pair - the composite is drawn contained
   * at both widths, and on a phone the band simply stacks.
   */
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  /*
   * What a screen reader reads in the artwork's place.
   *
   * Optional, unlike the heading and paragraph beside it - those already say
   * what the capability is, so the composite is usually decorative and an
   * empty alt is the correct markup for it. It is here because these
   * composites also carry their own captions and figures inside the picture,
   * and an editor who wants those spoken needs somewhere to put them.
   */
  image_alt         VARCHAR(255),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_capability_modules_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_capability_modules_display_order_check
    CHECK (display_order >= 0),
  -- Exactly one source: neither both at once nor neither at all.
  CONSTRAINT wms_capability_modules_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  -- Absent is how alt text is left off; blank is a stored empty string that
  -- reads the same but looks like an oversight, so it is rejected.
  CONSTRAINT wms_capability_modules_image_alt_check
    CHECK (image_alt IS NULL OR btrim(image_alt) <> ''),
  CONSTRAINT wms_capability_modules_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

-- The admin list and the public read both walk the stack in its own order,
-- which is the only ordering either one asks for.
CREATE INDEX idx_wms_capability_modules_order
  ON wms_capability_modules (display_order, created_at);
CREATE INDEX idx_wms_capability_modules_status
  ON wms_capability_modules (status);
CREATE INDEX idx_wms_capability_modules_image_file
  ON wms_capability_modules (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER wms_capability_modules_set_updated_at
  BEFORE UPDATE ON wms_capability_modules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
