-- Why UpWon page CMS: the proof & results section.
--
-- "Less Complexity. More Control. Better Outcomes." Three result cards, each a
-- figure, a title, a line of detail and an icon, over its own small visual: a
-- checklist of work that stops being manual, a trend chart, and a hub of
-- connected modules.
--
-- The product proof shape (079): one panel record and one list. The panel
-- holds what the visuals say - the checklist, the chart's title, badge and
-- note - and the hub artwork. The visual a card carries, and its colours,
-- follow display order, which is why the list is capped at three in the
-- application: there are three visuals.
--
-- The copy lives in page_section_copy under ('why-upwon', 'outcomes'). Both
-- keys are already allowed, so no check widens here.

-- ── the visuals panel ─────────────────────────────────────────────────────

CREATE TABLE why_upwon_results_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The hub artwork in the third card, from one of two mutually exclusive
  -- sources. Optional: with neither, the site keeps the one it ships.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the hub artwork. Required: it shows the modules.
  image_alt         VARCHAR(300)  NOT NULL,

  -- The first card's checklist, in order, and the line under each item.
  checklist_items   TEXT[]        NOT NULL,
  checklist_status  VARCHAR(40)   NOT NULL,

  -- The second card's chart: its title, the badge beside it, and the two-line
  -- note on the curve.
  trend_title       VARCHAR(60)   NOT NULL,
  trend_badge       VARCHAR(40)   NOT NULL,
  trend_note        VARCHAR(60)   NOT NULL,
  trend_note_sub    VARCHAR(60)   NOT NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_results_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT why_upwon_results_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT why_upwon_results_panel_alt_check
    CHECK (btrim(image_alt) <> ''),
  CONSTRAINT why_upwon_results_panel_checklist_check
    CHECK (cardinality(checklist_items) BETWEEN 1 AND 5),
  CONSTRAINT why_upwon_results_panel_text_check
    CHECK (btrim(checklist_status) <> '' AND btrim(trend_title) <> ''
           AND btrim(trend_badge) <> '' AND btrim(trend_note) <> ''
           AND btrim(trend_note_sub) <> '')
);

-- ── the results ───────────────────────────────────────────────────────────

CREATE TABLE why_upwon_results (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The headline figure as it is read: "30%", "2× Faster". Text, not a number.
  stat              VARCHAR(40)   NOT NULL,
  title             VARCHAR(120)  NOT NULL,
  description       VARCHAR(300)  NOT NULL,
  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_results_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT why_upwon_results_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT why_upwon_results_not_blank_check
    CHECK (btrim(stat) <> '' AND btrim(title) <> '' AND btrim(description) <> ''
           AND btrim(icon) <> '')
);

CREATE INDEX idx_why_upwon_results_order ON why_upwon_results (display_order, created_at);
CREATE INDEX idx_why_upwon_results_status ON why_upwon_results (status);

CREATE TRIGGER why_upwon_results_panel_set_updated_at
  BEFORE UPDATE ON why_upwon_results_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER why_upwon_results_set_updated_at
  BEFORE UPDATE ON why_upwon_results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
