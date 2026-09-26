-- Insider page CMS: the long-form feature section.
--
-- The block below the story grid that promotes one in-depth piece - an image
-- with a badge, a heading, a paragraph, a few bullets, and one call to action.
-- There is exactly one of it, so this is a singleton table rather than a list:
-- the primary key is pinned to 1, which makes a second row impossible.
--
-- Hiding the section is status = 'INACTIVE', not a deleted row. A missing row
-- means "never authored", and the site keeps its own static copy for that.

CREATE TABLE insider_feature_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The pill over the image ('Long-form'). Optional.
  badge          VARCHAR(40),

  eyebrow        VARCHAR(80)   NOT NULL,

  -- Authored text in the home page heading markup (utils/heading-markup):
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  -- The read API returns this raw and as a parsed segment tree.
  heading        TEXT          NOT NULL,

  body           TEXT          NOT NULL,

  -- The checklist under the paragraph, in order, as plain strings.
  bullets        JSONB         NOT NULL DEFAULT '[]'::jsonb,

  image_url      VARCHAR(1000),
  image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT insider_feature_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT insider_feature_section_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT insider_feature_section_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT insider_feature_section_bullets_is_array_check
    CHECK (jsonb_typeof(bullets) = 'array'),

  CONSTRAINT insider_feature_section_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(body) <> ''
      AND (badge IS NULL OR btrim(badge) <> '')
    )
);

-- No image_file_id index, unlike the list tables: a one-row table is its own
-- index.

CREATE TRIGGER insider_feature_section_set_updated_at
  BEFORE UPDATE ON insider_feature_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
