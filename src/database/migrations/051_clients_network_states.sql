-- Clients page CMS: "From Sambhajinagar to Kolkata." - the operational network.
--
-- A dark band inside the roster section: a heading block, three counters
-- (cities, states, zones), a grid of state cards listing their cities, and an
-- India map with a pin per city and lines fanning out from the first one.
--
-- Every number and every pin is derived from the rows below, so nothing here
-- stores a count or a map coordinate in pixels - only real latitude/longitude,
-- which the site projects onto its India outline.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('clients', 'network') - which is why the section-key check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
    -- Merge union: three branches each re-declared this list with only their
    -- own pages, so the last to run erased the rest. Every key the codebase
    -- declares is listed here - see PAGE_SECTION_KEYS in src/config/constants.ts.
      'hero', 'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers', 'proof',
      'video', 'packages', 'platform', 'helps', 'coverage', 'capabilities', 'network',
      'lifecycle'
    ));

-- ── the states ────────────────────────────────────────────────────────────

CREATE TABLE clients_network_states (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The card title ('Maharashtra').
  state             VARCHAR(80)   NOT NULL,
  -- Counted into the Zones stat. A fixed list, so 'West' and 'west' cannot
  -- count as two zones.
  zone              VARCHAR(20)   NOT NULL,

  -- The cities, in order, as an array of
  -- { "name": "Mumbai", "lat": 19.07, "lng": 72.87 }.
  -- jsonb rather than a child table: a city has no status, order or identity
  -- of its own - it is edited with its state, in one form. Shape, count and
  -- coordinate range are enforced by the validator.
  cities            JSONB         NOT NULL DEFAULT '[]'::jsonb,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_network_states_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_network_states_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT clients_network_states_zone_check
    CHECK (zone IN ('North', 'South', 'East', 'West', 'Central', 'North-East')),
  CONSTRAINT clients_network_states_state_not_blank_check
    CHECK (btrim(state) <> ''),
  CONSTRAINT clients_network_states_cities_array_check
    CHECK (jsonb_typeof(cities) = 'array')
);

-- The public read path: ACTIVE rows in display order.
CREATE INDEX clients_network_states_published_idx
  ON clients_network_states (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER clients_network_states_set_updated_at
  BEFORE UPDATE ON clients_network_states
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
