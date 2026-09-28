-- Clients page CMS: each section of a case study story, managed on its own.
--
-- 053 stored the story's four lists as jsonb arrays on clients_case_cards,
-- edited all at once inside the card form. The admin now manages the story
-- section by section - every row added, edited, reordered, deleted and
-- switched ACTIVE / INACTIVE on its own, and every section switched on or off
-- as a whole - so each list becomes a child table with its own order and
-- status, and each section gets a status column on the card.
--
--   section           rows table                     section status column
--   Headline outcomes clients_case_outcomes          outcomes_status
--   The Challenge     clients_case_challenges        challenges_status
--   Why UpWon         (why_upwon text on the card)   why_upwon_status
--   What We Delivered clients_case_timeline_steps    timeline_status
--   Delivered & Live  clients_case_deliverables      deliverables_status
--   Testimonial       (testimonial_* on the card)    testimonial_status
--
-- The card on /clients still shows the first three ACTIVE outcomes, whatever
-- the outcomes section's own status - hiding the story's outcomes band is not
-- a reason to strip the figures off the card.
--
-- Existing jsonb content is copied into the new tables, in order, before the
-- jsonb columns are dropped, so nothing authored under 053 is lost.

-- ── the rows ──────────────────────────────────────────────────────────────

CREATE TABLE clients_case_outcomes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID          NOT NULL REFERENCES clients_case_cards(id) ON DELETE CASCADE,
  -- Written exactly as it should read - '35 → 200+', '₹20 L+'.
  value           VARCHAR(40)   NOT NULL,
  label           VARCHAR(120)  NOT NULL,
  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_case_outcomes_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_case_outcomes_order_check CHECK (display_order >= 0),
  CONSTRAINT clients_case_outcomes_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

CREATE TABLE clients_case_challenges (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID          NOT NULL REFERENCES clients_case_cards(id) ON DELETE CASCADE,
  title           VARCHAR(120)  NOT NULL,
  description     VARCHAR(400)  NOT NULL,
  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_case_challenges_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_case_challenges_order_check CHECK (display_order >= 0),
  CONSTRAINT clients_case_challenges_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

CREATE TABLE clients_case_timeline_steps (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID          NOT NULL REFERENCES clients_case_cards(id) ON DELETE CASCADE,
  -- The small label - 'Week 1', 'Day 30', 'Month 4+'.
  week            VARCHAR(40)   NOT NULL,
  title           VARCHAR(120)  NOT NULL,
  detail          VARCHAR(400)  NOT NULL,
  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_case_timeline_steps_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_case_timeline_steps_order_check CHECK (display_order >= 0),
  CONSTRAINT clients_case_timeline_steps_not_blank_check
    CHECK (btrim(week) <> '' AND btrim(title) <> '' AND btrim(detail) <> '')
);

CREATE TABLE clients_case_deliverables (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID          NOT NULL REFERENCES clients_case_cards(id) ON DELETE CASCADE,
  text            VARCHAR(200)  NOT NULL,
  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_case_deliverables_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_case_deliverables_order_check CHECK (display_order >= 0),
  CONSTRAINT clients_case_deliverables_not_blank_check CHECK (btrim(text) <> '')
);

-- Every read is "this case's rows, in order".
CREATE INDEX clients_case_outcomes_case_idx ON clients_case_outcomes (case_id, display_order, created_at);
CREATE INDEX clients_case_challenges_case_idx ON clients_case_challenges (case_id, display_order, created_at);
CREATE INDEX clients_case_timeline_steps_case_idx ON clients_case_timeline_steps (case_id, display_order, created_at);
CREATE INDEX clients_case_deliverables_case_idx ON clients_case_deliverables (case_id, display_order, created_at);

CREATE TRIGGER clients_case_outcomes_set_updated_at
  BEFORE UPDATE ON clients_case_outcomes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clients_case_challenges_set_updated_at
  BEFORE UPDATE ON clients_case_challenges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clients_case_timeline_steps_set_updated_at
  BEFORE UPDATE ON clients_case_timeline_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clients_case_deliverables_set_updated_at
  BEFORE UPDATE ON clients_case_deliverables FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── carry the 053 content over ────────────────────────────────────────────

INSERT INTO clients_case_outcomes (case_id, value, label, display_order)
SELECT c.id, btrim(e.item->>'value'), btrim(e.item->>'label'), (e.ord - 1)::int
  FROM clients_case_cards c
 CROSS JOIN LATERAL jsonb_array_elements(c.outcomes) WITH ORDINALITY AS e(item, ord)
 WHERE btrim(coalesce(e.item->>'value', '')) <> '' AND btrim(coalesce(e.item->>'label', '')) <> '';

INSERT INTO clients_case_challenges (case_id, title, description, display_order)
SELECT c.id, btrim(e.item->>'title'), btrim(e.item->>'desc'), (e.ord - 1)::int
  FROM clients_case_cards c
 CROSS JOIN LATERAL jsonb_array_elements(c.challenges) WITH ORDINALITY AS e(item, ord)
 WHERE btrim(coalesce(e.item->>'title', '')) <> '' AND btrim(coalesce(e.item->>'desc', '')) <> '';

INSERT INTO clients_case_timeline_steps (case_id, week, title, detail, display_order)
SELECT c.id, btrim(e.item->>'week'), btrim(e.item->>'title'), btrim(e.item->>'detail'),
       (e.ord - 1)::int
  FROM clients_case_cards c
 CROSS JOIN LATERAL jsonb_array_elements(c.timeline) WITH ORDINALITY AS e(item, ord)
 WHERE btrim(coalesce(e.item->>'week', '')) <> ''
   AND btrim(coalesce(e.item->>'title', '')) <> ''
   AND btrim(coalesce(e.item->>'detail', '')) <> '';

INSERT INTO clients_case_deliverables (case_id, text, display_order)
SELECT c.id, btrim(e.item), (e.ord - 1)::int
  FROM clients_case_cards c
 CROSS JOIN LATERAL jsonb_array_elements_text(c.deliverables) WITH ORDINALITY AS e(item, ord)
 WHERE btrim(e.item) <> '';

-- ── swap the jsonb lists for section switches ─────────────────────────────

ALTER TABLE clients_case_cards
  DROP CONSTRAINT clients_case_cards_outcomes_array_check,
  DROP CONSTRAINT clients_case_cards_story_arrays_check;

ALTER TABLE clients_case_cards
  DROP COLUMN outcomes,
  DROP COLUMN challenges,
  DROP COLUMN timeline,
  DROP COLUMN deliverables;

ALTER TABLE clients_case_cards
  ADD COLUMN outcomes_status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN challenges_status    VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN why_upwon_status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN timeline_status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN deliverables_status  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN testimonial_status   VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE clients_case_cards
  ADD CONSTRAINT clients_case_cards_section_status_check
    CHECK (
      outcomes_status IN ('ACTIVE', 'INACTIVE')
      AND challenges_status IN ('ACTIVE', 'INACTIVE')
      AND why_upwon_status IN ('ACTIVE', 'INACTIVE')
      AND timeline_status IN ('ACTIVE', 'INACTIVE')
      AND deliverables_status IN ('ACTIVE', 'INACTIVE')
      AND testimonial_status IN ('ACTIVE', 'INACTIVE')
    );
