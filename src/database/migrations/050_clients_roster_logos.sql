-- Clients page CMS: "Trusted by India's Leading Food & FMCG Brands."
--
-- The roster band: a heading block over a scrolling marquee of client logos.
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('clients', 'trust') - 049 already added 'clients' to the page-key check,
-- and 'trust' is an allowed section key since the home page's.

CREATE TABLE clients_roster_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The brand name. Doubles as the logo's alt text and its hover title.
  name              VARCHAR(120)  NOT NULL,

  -- The logo, from one of two mutually exclusive sources:
  --   image_url      an absolute URL or a site-relative path - the seeded
  --                  logos are the website's own /images/testimonial/*.webp
  --   image_file_id  an asset uploaded through the files module
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_roster_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_roster_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT clients_roster_logos_name_not_blank_check
    CHECK (btrim(name) <> ''),
  CONSTRAINT clients_roster_logos_single_image_source_check
    CHECK (num_nonnulls(image_url, image_file_id) <= 1)
  -- No "image required" CHECK: image_file_id is ON DELETE SET NULL, so a
  -- purged upload would otherwise make the row violate its own constraint.
  -- The validator requires one on write, and the public read drops a logo
  -- whose image is gone.
);

-- The public read path: ACTIVE rows in display order.
CREATE INDEX clients_roster_logos_published_idx
  ON clients_roster_logos (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX clients_roster_logos_image_file_idx
  ON clients_roster_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER clients_roster_logos_set_updated_at
  BEFORE UPDATE ON clients_roster_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
