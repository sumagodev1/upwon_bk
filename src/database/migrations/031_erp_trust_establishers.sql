-- ERP product page CMS: "Compliant by Design. Connected to What You Already Use."
--
-- Two panels under one heading. The left is a small grid of compliance badges;
-- the right is the integration sphere.
--
-- Only the badges get a table. The sphere draws the same logos as the home
-- page's platform integrations section - the same assets, saying the same
-- thing about the same partners - so it reads them from home_integrations_
-- entries rather than keeping a second list that would drift the first time
-- somebody added a partner to one and not the other.
--
-- The eyebrow, heading and description above the panels live once in
-- page_section_copy under ('erp', 'establishers').

CREATE TABLE erp_establisher_badges (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  title             VARCHAR(160)  NOT NULL,
  -- The line under the title.
  subtext           VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT erp_establisher_badges_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_establisher_badges_icon_check
    CHECK (length(btrim(icon)) > 0),
  CONSTRAINT erp_establisher_badges_title_check
    CHECK (length(btrim(title)) > 0),
  CONSTRAINT erp_establisher_badges_subtext_check
    CHECK (length(btrim(subtext)) > 0)
);

CREATE INDEX idx_erp_establisher_badges_order
  ON erp_establisher_badges (display_order, created_at);
CREATE INDEX idx_erp_establisher_badges_status
  ON erp_establisher_badges (status);
