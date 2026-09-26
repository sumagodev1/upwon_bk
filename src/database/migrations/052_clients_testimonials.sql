-- Clients page CMS: "Real Teams. Real Outcomes." - the testimonials marquee.
--
-- A scrolling row of quote cards: star rating, the quote, a round photo, and
-- who said it. The eyebrow, heading and subtext live once in page_section_copy
-- under ('clients', 'testimonials') - 'clients' was added to the page-key
-- check by 049 and 'testimonials' is a section key since the home page's.

CREATE TABLE clients_testimonials (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stored without its quotation marks; the card draws those.
  quote             TEXT          NOT NULL,
  -- The bold line under the quote: a designation, not necessarily a name
  -- ('Finance Director').
  author            VARCHAR(120)  NOT NULL,
  -- The line under it: the company ('Monginis').
  company           VARCHAR(120)  NOT NULL,
  -- The gold stars along the top, out of five.
  rating            SMALLINT      NOT NULL DEFAULT 5,

  -- The round photo, from one of two mutually exclusive sources. Optional:
  -- without one the card draws the author's initials instead.
  avatar_url        VARCHAR(1000),
  avatar_file_id    UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The colour those initials are drawn in (a #rrggbb hex).
  fallback_color    VARCHAR(7)    NOT NULL DEFAULT '#E85A2A',

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_testimonials_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT clients_testimonials_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT clients_testimonials_rating_check
    CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT clients_testimonials_fallback_color_check
    CHECK (fallback_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT clients_testimonials_copy_not_blank_check
    CHECK (btrim(quote) <> '' AND btrim(author) <> '' AND btrim(company) <> ''),
  CONSTRAINT clients_testimonials_single_avatar_source_check
    CHECK (num_nonnulls(avatar_url, avatar_file_id) <= 1)
);

-- The public read path: ACTIVE rows in display order.
CREATE INDEX clients_testimonials_published_idx
  ON clients_testimonials (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX clients_testimonials_avatar_file_idx
  ON clients_testimonials (avatar_file_id)
  WHERE avatar_file_id IS NOT NULL;

CREATE TRIGGER clients_testimonials_set_updated_at
  BEFORE UPDATE ON clients_testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
