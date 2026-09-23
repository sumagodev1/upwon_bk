-- Home page CMS: trust section.
--
-- NOTE: superseded by 013_home_page_trust_single_table.sql, which folds the two
-- child tables below into JSONB columns on home_trust_section. This file is
-- left as it was applied - rewriting an applied migration would make the
-- recorded history disagree with what actually ran.

CREATE TABLE home_trust_section (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow       VARCHAR(120)  NOT NULL,
  heading       TEXT          NOT NULL,
  subtext       TEXT          NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  singleton     BOOLEAN       NOT NULL DEFAULT true UNIQUE,

  created_by    UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by    UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_trust_section_singleton_check CHECK (singleton),

  CONSTRAINT home_trust_section_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_trust_section_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
    )
);

CREATE TRIGGER home_trust_section_set_updated_at
  BEFORE UPDATE ON home_trust_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE home_trust_logos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url       VARCHAR(1000),
  image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  alt             VARCHAR(255)  NOT NULL,
  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_trust_logos_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT home_trust_logos_image_required_check
    CHECK (image_url IS NOT NULL OR image_file_id IS NOT NULL),

  CONSTRAINT home_trust_logos_alt_not_blank_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX home_trust_logos_published_idx
  ON home_trust_logos (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX home_trust_logos_image_file_idx
  ON home_trust_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER home_trust_logos_set_updated_at
  BEFORE UPDATE ON home_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE home_trust_stats (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  value           VARCHAR(40)   NOT NULL,
  label           VARCHAR(120)  NOT NULL,
  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_trust_stats_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT home_trust_stats_copy_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

CREATE INDEX home_trust_stats_published_idx
  ON home_trust_stats (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER home_trust_stats_set_updated_at
  BEFORE UPDATE ON home_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
