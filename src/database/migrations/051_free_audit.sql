-- Free Operational Audit: the /free-audit page's hero, and the audit requests
-- the form further down that page produces. Managed from the admin panel's
-- "Resource Page > Free Operational Audit" sidebar item.
--
-- Two tables, one per thing the user asked to manage:
--
--   free_audit_hero_slides    the hero carousel - content an admin writes and
--                             the website reads.
--   free_audit_applications   the form's inbox - records the website writes and
--                             only the admin panel reads.
--
-- ── the hero ──────────────────────────────────────────────────────────────
--
-- The page renders the site's shared HeroSlider, the same component as the
-- /blog hero, so it is authored the same way: blog_hero_slides (050) column
-- for column, with the same decisions -
--
--   an eyebrow column, required: the page's pill is authored copy
--     ('FREE · 60 MINUTES · NO COMMITMENT'), not derived from the URL.
--   no image_alt column. HeroSlider draws the backdrop as decoration
--     (alt=""), so there is no text to author.
--   no mobile_image_url column. Pictures are uploads; the page has never had
--     a phone crop to carry over, so the phone image is a file id only.
--   image_url is legacy / seed-only, as on blog_hero_slides: it holds the
--     seeded slide's site artwork ('/images/home_hero_bg.webp'), for which no
--     uploaded file exists, and the admin API never writes a URL into it. The
--     slide's first upload, or removing its picture, clears it.
--
-- No button labels: the site fixes both buttons in its code
-- (FreeAuditPage.jsx: 'Book the Audit' -> /demo, 'Take the Self-Evaluation'
-- -> /self-evaluation).
--
-- No row is inserted here: the seed (free-audit.data.ts) puts the page's one
-- slide into the empty table, so the panel starts from what the site shows.

CREATE TABLE free_audit_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps pill above the headline.
  eyebrow               VARCHAR(120)  NOT NULL,
  -- Plain text. HeroSlider sets the weight itself by splitting on an em-dash,
  -- so there is no accent markup to store.
  heading               TEXT          NOT NULL,
  subtext               TEXT          NOT NULL,

  -- The desktop background: an upload (image_file_id), or the legacy seeded
  -- site path (image_url - see above). At most one of them; neither means the
  -- site draws the slide on its built-in backdrop.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Narrow-viewport art, an upload only. NULL falls back to the desktop image.
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Ascending. Not UNIQUE, for the same reason as home_hero_slides: a reorder
  -- rewrites the whole set in one statement.
  display_order         INTEGER       NOT NULL DEFAULT 0,

  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT free_audit_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT free_audit_hero_slides_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT free_audit_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT free_audit_hero_slides_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX free_audit_hero_slides_published_idx
  ON free_audit_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX free_audit_hero_slides_image_file_idx
  ON free_audit_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX free_audit_hero_slides_mobile_image_file_idx
  ON free_audit_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER free_audit_hero_slides_set_updated_at
  BEFORE UPDATE ON free_audit_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the audit requests ────────────────────────────────────────────────────
--
-- The fifth table in this CMS written by an anonymous visitor and read only
-- inside the admin panel - after contact_enquiries, career_applications,
-- partner_program_applications and about_discovery_calls - and the reasoning
-- there applies here too: there is no mail transport in this project, so the
-- row IS the delivery, and losing it loses the lead.
--
-- Until now it was lost every time. The form's submit handler only set
-- `submitted` and showed the thank-you panel: every visitor who asked for an
-- audit was told "we'll be in touch" and nothing was stored anywhere. That is
-- the failure this table exists to end.
--
-- One column per field the form renders, and nothing more:
--
--   no status    The user asked for the list of who asked for an audit, not a
--                pipeline - the same call contact_enquiries,
--                partner_program_applications and about_discovery_calls made.
--   no file      Nothing is attached, so nothing here touches storage.
--
-- Immutable by design, like all four before it: no updated_at, no updated_by,
-- no trigger. The only writes are the visitor's insert and an admin's delete. A
-- record an administrator could rewrite would stop being evidence of what was
-- actually sent.

CREATE TABLE free_audit_applications (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The form's 'Full name *'. Sized like partner_program_applications.full_name:
  -- the same question of the same kind of visitor.
  full_name             VARCHAR(120)  NOT NULL,

  -- 'Company *'. Required on the form, so required here.
  company               VARCHAR(160)  NOT NULL,

  -- 'Your role' - 'COO, CFO, Operations Head…' is its own placeholder, and the
  -- form does not mark it required, so it is nullable here.
  role                  VARCHAR(120),

  -- 'Mobile *'. Wide and permissive for the reason every other public form's
  -- number is: a visitor types their number the way they say it, country code,
  -- spaces, brackets and all, and refusing that shape loses the lead. Sized to
  -- VISITOR_PHONE_MAX in core/utils/visitor-phone.
  mobile                VARCHAR(40)   NOT NULL,

  -- 'Work email *'. CITEXT like partner_program_applications.work_email: two
  -- people who type the same address in different cases are one address when
  -- the list is searched.
  email                 CITEXT        NOT NULL,

  -- 'Revenue range' - one of the four chips the form renders, stored exactly as
  -- the chip reads. Always sent: the form preselects '₹25–200 Crore'. The list
  -- is FREE_AUDIT_REVENUE_RANGES in modules/free-audit/utils/revenue-ranges.ts;
  -- the CHECK below restates it, so changing one means changing both.
  revenue_range         VARCHAR(40)   NOT NULL,

  -- 'Your single biggest operational pain'. A free-text textarea the form does
  -- not mark required, so nullable here.
  pain                  VARCHAR(2000),

  -- Triage only, never shown on the public site and never echoed back to the
  -- submitter: enough to tell a burst of spam from a real run of interest.
  submitted_ip          INET,
  submitted_user_agent  TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT free_audit_applications_required_not_blank_check
    CHECK (
      btrim(full_name) <> '' AND btrim(company) <> ''
      AND btrim(mobile) <> '' AND btrim(email::text) <> ''
    ),

  -- A last line of defence, not the format check: that is the validator's, and
  -- it reports which field is wrong to the visitor who can fix it.
  CONSTRAINT free_audit_applications_email_shape_check
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  CONSTRAINT free_audit_applications_revenue_range_check
    CHECK (revenue_range IN ('< ₹25 Crore', '₹25–200 Crore', '₹200–1,000 Crore', '₹1,000 Crore+'))

  -- No phone shape CHECK. The format check is the validator's, and the shared
  -- visitor-phone rule is deliberately looser than anything a CHECK could
  -- usefully restate - see core/utils/visitor-phone.ts.
);

-- The list is read newest first and in no other order, so one index covers the
-- table, the date-range filter and the pagination's COUNT(*) OVER().
CREATE INDEX free_audit_applications_created_idx
  ON free_audit_applications (created_at DESC);
