-- Social Media Links CMS: the site footer's contact lines and social icons.
--
-- Two ordered child lists and no singleton. The footer has no heading over
-- either list for an admin to author, so there is no section row here the way
-- 025 and 026 have one: the rows ARE the content, and each list is created,
-- edited, published, reordered and deleted on the About page's pattern.
--
-- These values used to come from the website's src/data/company.js
-- (COMPANY.contact) and from two hard-coded icons in Footer.jsx. Only the
-- footer stops reading them: the rest of the site - the floating actions, the
-- navbar, the sticky bar, the Contact and About CTAs - still uses company.js
-- for everything else, and the Contact page keeps its own email and phone in
-- contact_details_section (017). Each area owns its copy, the convention 017
-- and 024 already follow.
--
-- No default rows are inserted here. The four contact lines the footer ships
-- today and its LinkedIn and Twitter buttons are seeded
-- (src/database/seeds/social-media-links.data.ts, which explains the buttons'
-- addresses).

CREATE TABLE social_contact_lines (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * What the line IS, which decides how the site links it: an ADDRESS is plain
   * text, an EMAIL a mailto:, a PHONE a tel: with the punctuation stripped, a
   * WEBSITE an https:// link. A closed list mirrored by
   * SOCIAL_CONTACT_LINE_KINDS in config/constants - the site cannot safely
   * guess the kind from the text, and the validator keys its per-kind rule on
   * it. Several rows of one kind are allowed (two phone numbers is an ordinary
   * footer).
   */
  kind           VARCHAR(20)   NOT NULL,

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react (plus two inline brand glyphs), which exports components
  -- rather than images. The allowlist lives in
  -- modules/social-media-links/utils/icons.ts.
  icon           VARCHAR(60)   NOT NULL,

  /*
   * The text the footer prints, and the one it links from. 254 is the longest
   * of the four kinds' limits - an email address's own ceiling; the validator
   * holds each kind to its own (address 160, phone 30, website 200). The site
   * derives the link from this and the kind, so there is no href column that
   * could disagree with the text beside it.
   */
  value          VARCHAR(254)  NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT social_contact_lines_kind_check
    CHECK (kind IN ('ADDRESS', 'EMAIL', 'PHONE', 'WEBSITE')),

  CONSTRAINT social_contact_lines_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT social_contact_lines_display_order_check
    CHECK (display_order >= 0),

  -- The per-kind format rules belong to the validator; this is only the last
  -- line of defence against a row that would render as an empty line.
  CONSTRAINT social_contact_lines_copy_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(value) <> '')
);

-- The public read: ACTIVE lines, in display order.
CREATE INDEX social_contact_lines_published_idx
  ON social_contact_lines (display_order, created_at)
  WHERE status = 'ACTIVE';

-- The admin list, whole and ordered.
CREATE INDEX social_contact_lines_order_idx
  ON social_contact_lines (display_order ASC, created_at ASC);

CREATE TRIGGER social_contact_lines_set_updated_at
  BEFORE UPDATE ON social_contact_lines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the social icons ──────────────────────────────────────────────────────

CREATE TABLE social_links (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What the button is called ('LinkedIn') - its aria-label and tooltip. The
  -- button shows only the icon, so this is the one thing a screen reader says.
  -- Never typed by an administrator: the service writes the platform name for
  -- the icon (SOCIAL_LINK_LABELS in modules/social-media-links/utils/icons.ts)
  -- whenever the icon is set, so the two never disagree.
  label          VARCHAR(40)   NOT NULL,

  -- A name from the same icon allowlist as the contact lines.
  icon           VARCHAR(60)   NOT NULL,

  -- A profile on another site, always as a full http(s) address. The
  -- validator also refuses whitespace, credentials and undotted hosts; the
  -- CHECK below holds the one rule the site's own re-check relies on.
  url            VARCHAR(500)  NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT social_links_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT social_links_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT social_links_copy_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(icon) <> ''),

  -- No javascript:, no data:, no site-relative path, no '#' placeholder.
  CONSTRAINT social_links_url_shape_check
    CHECK (url ~* '^https?://')
);

CREATE INDEX social_links_published_idx
  ON social_links (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX social_links_order_idx
  ON social_links (display_order ASC, created_at ASC);

CREATE TRIGGER social_links_set_updated_at
  BEFORE UPDATE ON social_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
