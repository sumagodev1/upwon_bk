-- ERP product page CMS: "UPWON ERP - Benefits for Everyone".
--
-- The section is a left-hand list of audiences and a right-hand proof panel
-- that swaps as the visitor moves down the list. So almost everything on the
-- right belongs to the audience, not to the section:
--
--   erp_journey_personas  the five audiences, each carrying its own headline
--                         metric, its own attributed person, and the two lists
--   erp_journey_outcomes  "Measurable outcomes" - per persona
--   erp_journey_points    "Beyond the numbers" - per persona
--   erp_journey_stats     the three-up row of company-wide figures, which is
--                         the one thing on the right that does NOT change with
--                         the selection
--
-- Modelling the outcomes, points or the attributed person once for the whole
-- section would make all five audiences show the same proof, which is not what
-- the page does today.
--
-- The eyebrow, heading and description that head the section are not here.
-- They live once in page_section_copy under ('erp', 'benefits'), and the orange
-- highlight is the **accent** marker inside that heading.

CREATE TABLE erp_journey_personas (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The row's eyebrow reads "For the {role} · {context}". Stored as two fields
  -- so an editor fills in the parts and never retypes the connector, and
  -- composed back into one string by the API - which keeps the sentence
  -- pattern out of the website component.
  role                  VARCHAR(120)  NOT NULL,
  context               VARCHAR(200)  NOT NULL,
  title                 VARCHAR(200)  NOT NULL,
  description           TEXT          NOT NULL,

  -- The headline figure above the proof panel, in one of two forms.
  --
  -- metric_count_to set  -> the number animates up from zero on scroll
  -- metric_text set      -> shown as written, for ranges like "8-18%" that
  --                         cannot count
  --
  -- Exactly one of the two, enforced below: a row with both would leave the
  -- site choosing, and a row with neither renders an empty panel.
  metric_count_to       INTEGER,
  metric_text           VARCHAR(40),
  metric_prefix         VARCHAR(16),
  metric_suffix         VARCHAR(16),
  metric_label          VARCHAR(255)  NOT NULL,

  -- Who the proof is attributed to. The page shows a designation and a company
  -- rather than a person's name, so that is what is stored.
  author_designation    VARCHAR(160)  NOT NULL,
  author_company        VARCHAR(160)  NOT NULL,
  -- The portrait, from one of two mutually exclusive sources.
  avatar_url            VARCHAR(1000),
  avatar_file_id        UUID          REFERENCES files(id) ON DELETE SET NULL,
  avatar_alt            VARCHAR(255),
  -- Behind the initials when the portrait is missing or fails to load.
  avatar_color          VARCHAR(32)   NOT NULL DEFAULT '#1565C0',

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT erp_journey_personas_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_journey_personas_metric_check
    CHECK (num_nonnulls(metric_count_to, metric_text) = 1),
  CONSTRAINT erp_journey_personas_avatar_source_check
    CHECK (num_nonnulls(avatar_url, avatar_file_id) <= 1),
  CONSTRAINT erp_journey_personas_role_check
    CHECK (length(btrim(role)) > 0),
  CONSTRAINT erp_journey_personas_context_check
    CHECK (length(btrim(context)) > 0),
  CONSTRAINT erp_journey_personas_title_check
    CHECK (length(btrim(title)) > 0),
  CONSTRAINT erp_journey_personas_description_check
    CHECK (length(btrim(description)) > 0),
  CONSTRAINT erp_journey_personas_metric_label_check
    CHECK (length(btrim(metric_label)) > 0),
  CONSTRAINT erp_journey_personas_designation_check
    CHECK (length(btrim(author_designation)) > 0),
  CONSTRAINT erp_journey_personas_company_check
    CHECK (length(btrim(author_company)) > 0)
);

CREATE INDEX idx_erp_journey_personas_order
  ON erp_journey_personas (display_order, created_at);
CREATE INDEX idx_erp_journey_personas_status
  ON erp_journey_personas (status);

-- "Measurable outcomes" - the ticked list under the attributed person.
CREATE TABLE erp_journey_outcomes (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deleting the persona takes its outcomes with it. They describe that
  -- audience's results and mean nothing detached from it.
  persona_id            UUID          NOT NULL
                                      REFERENCES erp_journey_personas(id) ON DELETE CASCADE,

  -- One line, as the page renders it. The figure and its explanation are a
  -- single sentence there ("18% wastage reduction within the first year"),
  -- so splitting them would mean guessing where one ends.
  text                  TEXT          NOT NULL,
  -- A name from the icon allowlist. The page ticks every line today, so this
  -- defaults to that tick rather than forcing a choice on every row.
  icon                  VARCHAR(60)   NOT NULL DEFAULT 'CheckCircle2',

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT erp_journey_outcomes_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_journey_outcomes_text_check
    CHECK (length(btrim(text)) > 0),
  CONSTRAINT erp_journey_outcomes_icon_check
    CHECK (length(btrim(icon)) > 0)
);

CREATE INDEX idx_erp_journey_outcomes_persona
  ON erp_journey_outcomes (persona_id, display_order, created_at);
CREATE INDEX idx_erp_journey_outcomes_status
  ON erp_journey_outcomes (status);

-- "Beyond the numbers" - the bulleted list below the outcomes.
--
-- No icon column: the page marks these with a small round dot drawn in CSS,
-- not an icon, so a column for one would never be read.
CREATE TABLE erp_journey_points (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id            UUID          NOT NULL
                                      REFERENCES erp_journey_personas(id) ON DELETE CASCADE,

  text                  TEXT          NOT NULL,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT erp_journey_points_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_journey_points_text_check
    CHECK (length(btrim(text)) > 0)
);

CREATE INDEX idx_erp_journey_points_persona
  ON erp_journey_points (persona_id, display_order, created_at);
CREATE INDEX idx_erp_journey_points_status
  ON erp_journey_points (status);

-- The company-wide figures beside the headline metric.
--
-- Section-level, and the only part of the right-hand panel that is: the same
-- three show whichever audience is selected, so they are written once.
CREATE TABLE erp_journey_stats (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Written exactly as it should read. These are figures like "3,500+" that
  -- carry their own separator and sign, so the site prints them rather than
  -- formatting a number it was handed.
  value                 VARCHAR(40)   NOT NULL,
  prefix                VARCHAR(16),
  suffix                VARCHAR(16),
  label                 VARCHAR(160)  NOT NULL,
  -- Longer wording for the same figure. Nothing renders it today; it exists
  -- because the headline metric beside these carries one, and an editor
  -- promoting a stat should not lose the sentence.
  description           TEXT,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT erp_journey_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_journey_stats_value_check
    CHECK (length(btrim(value)) > 0),
  CONSTRAINT erp_journey_stats_label_check
    CHECK (length(btrim(label)) > 0)
);

CREATE INDEX idx_erp_journey_stats_order
  ON erp_journey_stats (display_order, created_at);
CREATE INDEX idx_erp_journey_stats_status
  ON erp_journey_stats (status);
