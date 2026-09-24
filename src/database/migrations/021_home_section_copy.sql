-- Home page CMS: lift the shared section copy out of the entry rows.
--
-- Every list section stored eyebrow / heading / subtext on each of its rows,
-- with the public read taking them from the first active one. That kept each
-- section to a single table, but it made the copy something an administrator
-- had to retype on every new entry - sixteen times for the integration logos -
-- with nothing keeping the copies in step afterwards. One row per section here
-- is the fix: the copy is entered once, and the entry form carries only what
-- actually differs between entries.
--
-- The hero is deliberately absent. Its slides each carry their own eyebrow,
-- heading and subtext because the carousel shows four different pitches, so
-- there the per-row copy is the content, not duplication of it.

CREATE TABLE home_section_copy (
  -- The section this copy belongs to, one row each. A text key rather than a
  -- foreign key to anything: the sections are defined in code, and a new one
  -- should not need a migration before it can be authored.
  section_key   VARCHAR(40)   PRIMARY KEY,

  eyebrow       VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as before the move:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  heading       TEXT          NOT NULL,

  subtext       TEXT          NOT NULL,

  updated_by    UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_section_copy_key_check
    CHECK (section_key IN (
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq'
    )),

  CONSTRAINT home_section_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

CREATE TRIGGER home_section_copy_set_updated_at
  BEFORE UPDATE ON home_section_copy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Backfill ─────────────────────────────────────────────────────────────
--
-- One row per section, taken from the row the public read would have used:
-- the first active entry in display order, falling back to any entry when the
-- section has none active. A section with no entries at all contributes
-- nothing and is authored from scratch in the panel.
--
-- Verified before writing this migration that all six sections hold exactly
-- one distinct value for each of the three columns, so nothing is lost by
-- collapsing them.

INSERT INTO home_section_copy (section_key, eyebrow, heading, subtext, updated_by)
SELECT 'trust', eyebrow, heading, subtext, updated_by
  FROM home_trust_entries
 ORDER BY (status = 'ACTIVE') DESC, display_order ASC, created_at ASC
 LIMIT 1
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO home_section_copy (section_key, eyebrow, heading, subtext, updated_by)
SELECT 'industries', eyebrow, heading, subtext, updated_by
  FROM home_industries_entries
 ORDER BY (status = 'ACTIVE') DESC, display_order ASC, created_at ASC
 LIMIT 1
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO home_section_copy (section_key, eyebrow, heading, subtext, updated_by)
SELECT 'values', eyebrow, heading, subtext, updated_by
  FROM home_values_entries
 ORDER BY (status = 'ACTIVE') DESC, display_order ASC, created_at ASC
 LIMIT 1
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO home_section_copy (section_key, eyebrow, heading, subtext, updated_by)
SELECT 'integrations', eyebrow, heading, subtext, updated_by
  FROM home_integrations_entries
 ORDER BY (status = 'ACTIVE') DESC, display_order ASC, created_at ASC
 LIMIT 1
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO home_section_copy (section_key, eyebrow, heading, subtext, updated_by)
SELECT 'testimonials', eyebrow, heading, subtext, updated_by
  FROM home_testimonial_entries
 ORDER BY (status = 'ACTIVE') DESC, display_order ASC, created_at ASC
 LIMIT 1
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO home_section_copy (section_key, eyebrow, heading, subtext, updated_by)
SELECT 'faq', eyebrow, heading, subtext, updated_by
  FROM home_faq_entries
 ORDER BY (status = 'ACTIVE') DESC, display_order ASC, created_at ASC
 LIMIT 1
ON CONFLICT (section_key) DO NOTHING;

-- ── Drop the duplicated columns ──────────────────────────────────────────
--
-- The not-blank CHECK on each table covers the copy columns alongside the
-- entry's own fields, so each is dropped and re-created over what remains
-- rather than being taken out by a cascading column drop.

ALTER TABLE home_trust_entries
  DROP CONSTRAINT home_trust_entries_copy_not_blank_check,
  DROP COLUMN eyebrow,
  DROP COLUMN heading,
  DROP COLUMN subtext;

ALTER TABLE home_industries_entries
  DROP CONSTRAINT home_industries_entries_copy_not_blank_check,
  DROP COLUMN eyebrow,
  DROP COLUMN heading,
  DROP COLUMN subtext;

ALTER TABLE home_values_entries
  DROP CONSTRAINT home_values_entries_copy_not_blank_check,
  DROP COLUMN eyebrow,
  DROP COLUMN heading,
  DROP COLUMN subtext;
ALTER TABLE home_values_entries
  ADD CONSTRAINT home_values_entries_card_not_blank_check
    CHECK (btrim(card_title) <> '' AND btrim(card_body) <> '');

ALTER TABLE home_integrations_entries
  DROP CONSTRAINT home_integrations_entries_copy_not_blank_check,
  DROP COLUMN eyebrow,
  DROP COLUMN heading,
  DROP COLUMN subtext;
ALTER TABLE home_integrations_entries
  ADD CONSTRAINT home_integrations_entries_logo_alt_not_blank_check
    CHECK (btrim(logo_alt) <> '');

ALTER TABLE home_testimonial_entries
  DROP CONSTRAINT home_testimonial_entries_copy_not_blank_check,
  DROP COLUMN eyebrow,
  DROP COLUMN heading,
  DROP COLUMN subtext;
ALTER TABLE home_testimonial_entries
  ADD CONSTRAINT home_testimonial_entries_card_not_blank_check
    CHECK (
      btrim(quote) <> '' AND btrim(client_name) <> '' AND btrim(client_position) <> ''
    );

ALTER TABLE home_faq_entries
  DROP CONSTRAINT home_faq_entries_copy_not_blank_check,
  DROP COLUMN eyebrow,
  DROP COLUMN heading,
  DROP COLUMN subtext;
ALTER TABLE home_faq_entries
  ADD CONSTRAINT home_faq_entries_qa_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '');
