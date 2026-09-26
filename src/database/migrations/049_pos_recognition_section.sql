-- POS product page CMS: the category map.
--
-- "Built for Bakery Counters, Sweets Shops, Dine-In, QSR and Every Food Retail
-- Business in Between." A sticky heading on the left beside a three-column
-- grid of dark cards, each naming one kind of counter so a visitor finds
-- themselves in the list immediately.
--
-- One table, because a card is one thing: an icon, a name and a line about it.
-- The FMS page's equivalent is a much richer object - artwork, accent colours,
-- an explore link, its own steps and benefits - because that section is an
-- interactive map with a selected category. This one is a flat wall of cards
-- and nothing about it is selectable, so there is nothing else to store.
--
-- The eyebrow, heading and subtext on the left live once in page_section_copy
-- under ('pos', 'recognition'). Both halves of that key already pass their
-- checks - 'pos' was widened in by 047, and 'recognition' is used by the ERP
-- and FMS pages - so no constraint widens here.

CREATE TABLE pos_recognition_categories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  -- The kind of counter, as the card's heading.
  title             VARCHAR(160)  NOT NULL,
  /*
   * The line under it. Bounded rather than TEXT: every card in the grid is
   * the same height as its tallest neighbour, so one long description pushes
   * an entire row of cards taller. The longest shipped line is 65 characters.
   */
  description       VARCHAR(240)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_recognition_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_recognition_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_recognition_categories_not_blank_check
    CHECK (
      btrim(icon) <> ''
      AND btrim(title) <> ''
      AND btrim(description) <> ''
    )
);

CREATE INDEX idx_pos_recognition_categories_order
  ON pos_recognition_categories (display_order, created_at);
CREATE INDEX idx_pos_recognition_categories_status
  ON pos_recognition_categories (status);

CREATE TRIGGER pos_recognition_categories_set_updated_at
  BEFORE UPDATE ON pos_recognition_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
