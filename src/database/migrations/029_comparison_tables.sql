-- A comparison table, as content rather than as code.
--
-- Built for the ERP page's "UPWON vs the Alternatives", but the names carry no
-- page in them: the same five tables serve any page that needs a comparison
-- grid, which is why the section row records which page and section it belongs
-- to rather than the tables being called erp_*.
--
--   comparison_sections    one grid; owns its columns and its categories
--   comparison_columns     the competitor columns, left to right
--   comparison_categories  the grouping bands down the grid
--   comparison_rows        one parameter per row, inside a category
--   comparison_values      one cell: what a row says in a column
--
-- The leader column ("How They Compare") is NOT a comparison column. It carries
-- the row's parameter rather than a value, and it is wider than the rest, so it
-- lives on the section as two fields. Modelling it as a column would mean the
-- site had to work out which column was the odd one out before it could draw
-- anything.
--
-- The eyebrow, heading and description above the grid are not here either.
-- They live once in page_section_copy under ('erp', 'alternatives').

CREATE TABLE comparison_sections (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which page and section this grid belongs to. One grid per section, so a
  -- second page adding a comparison gets its own row rather than a migration.
  page_key              VARCHAR(40)   NOT NULL,
  section_key           VARCHAR(40)   NOT NULL,

  -- The leader column's header, above the parameter names.
  leader_label          VARCHAR(160)  NOT NULL,
  leader_description    VARCHAR(255),

  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT comparison_sections_unique UNIQUE (page_key, section_key),
  CONSTRAINT comparison_sections_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT comparison_sections_leader_label_check
    CHECK (length(btrim(leader_label)) > 0)
);

CREATE TABLE comparison_columns (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id            UUID          NOT NULL
                                      REFERENCES comparison_sections(id) ON DELETE CASCADE,

  name                  VARCHAR(160)  NOT NULL,
  description           VARCHAR(255),

  -- Optional wordmark above the name. Nothing sets one today - the header is
  -- text - so a column without a logo renders exactly as it does now.
  logo_url              VARCHAR(1000),
  logo_file_id          UUID          REFERENCES files(id) ON DELETE SET NULL,
  logo_alt              VARCHAR(255),

  /*
   * Editorial: which side of the comparison this column is.
   *
   * Rendering keys off highlight_column, not off this - a grid could highlight
   * a competitor to make a point, and the styling should follow the intent of
   * the person editing rather than the label. This records what the column IS,
   * so a later template can tell "us" from "them" without inferring it from
   * the colour.
   */
  column_type           VARCHAR(20)   NOT NULL DEFAULT 'COMPETITOR',
  -- Drives the tinted band, the bullet and the bolder text.
  highlight_column      BOOLEAN       NOT NULL DEFAULT FALSE,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT comparison_columns_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT comparison_columns_type_check
    CHECK (column_type IN ('OURS', 'COMPETITOR')),
  CONSTRAINT comparison_columns_single_logo_source_check
    CHECK (num_nonnulls(logo_url, logo_file_id) <= 1),
  CONSTRAINT comparison_columns_name_check
    CHECK (length(btrim(name)) > 0)
);

CREATE INDEX idx_comparison_columns_section
  ON comparison_columns (section_id, display_order, created_at);
CREATE INDEX idx_comparison_columns_status
  ON comparison_columns (status);

CREATE TABLE comparison_categories (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id            UUID          NOT NULL
                                      REFERENCES comparison_sections(id) ON DELETE CASCADE,

  name                  VARCHAR(160)  NOT NULL,
  -- Longer wording for the band. Nothing renders it today; the grid shows the
  -- name alone. Kept because a band that needs a sentence should not need a
  -- migration to get one.
  description           VARCHAR(400),

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT comparison_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT comparison_categories_name_check
    CHECK (length(btrim(name)) > 0)
);

CREATE INDEX idx_comparison_categories_section
  ON comparison_categories (section_id, display_order, created_at);
CREATE INDEX idx_comparison_categories_status
  ON comparison_categories (status);

CREATE TABLE comparison_rows (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deleting the category takes its rows with it, and their cells with them.
  category_id           UUID          NOT NULL
                                      REFERENCES comparison_categories(id) ON DELETE CASCADE,

  -- What is being compared, shown in the leader column.
  parameter             VARCHAR(255)  NOT NULL,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT comparison_rows_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT comparison_rows_parameter_check
    CHECK (length(btrim(parameter)) > 0)
);

CREATE INDEX idx_comparison_rows_category
  ON comparison_rows (category_id, display_order, created_at);
CREATE INDEX idx_comparison_rows_status
  ON comparison_rows (status);

/*
 * One cell.
 *
 * No display order and no status of its own: where a cell sits is decided by
 * its row and its column, and a cell nobody wants is an empty one, not an
 * inactive one. Deleting either parent removes it - a column that no longer
 * exists must not leave orphaned text behind.
 *
 * At most one cell per (row, column), so a grid can never hold two answers for
 * the same question.
 */
CREATE TABLE comparison_values (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id                UUID          NOT NULL
                                      REFERENCES comparison_rows(id) ON DELETE CASCADE,
  column_id             UUID          NOT NULL
                                      REFERENCES comparison_columns(id) ON DELETE CASCADE,

  content               VARCHAR(400)  NOT NULL,

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT comparison_values_unique UNIQUE (row_id, column_id),
  CONSTRAINT comparison_values_content_check
    CHECK (length(btrim(content)) > 0)
);

CREATE INDEX idx_comparison_values_row ON comparison_values (row_id);
CREATE INDEX idx_comparison_values_column ON comparison_values (column_id);
