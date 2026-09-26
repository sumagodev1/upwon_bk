-- Partner Program page: the applications the form at the foot of /partners
-- produces.
--
-- The third table in this CMS written by an anonymous visitor and read only
-- inside the admin panel - contact_enquiries is the first, career_applications
-- the second - and the reasoning there applies here too: there is no mail
-- transport in this project, so the row IS the delivery, and losing it loses
-- the partner. Until this migration the form's submit handler was a
-- window.alert() and nothing was delivered at all.
--
-- Simpler than either of the two before it:
--
--   no file      An applicant to the partner programme attaches nothing, so
--                nothing here touches storage.
--   no status    The user asked for the list of who applied, not a pipeline.
--                career_applications carries a status because a candidate is
--                triaged over weeks by several people; a partner enquiry is
--                read once and either acted on or deleted, which is exactly
--                what contact_enquiries does - and it has no status either.
--
-- Immutable by design, like both of them: no updated_at, no updated_by, no
-- trigger. The only writes are the visitor's insert and an admin's delete. An
-- application an administrator could rewrite would stop being evidence of what
-- was actually sent.

CREATE TABLE partner_program_applications (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name             VARCHAR(120)  NOT NULL,

  -- Required, unlike contact_enquiries.company being required and
  -- career_applications having none: the form asks for it with an asterisk,
  -- and a partner application with no firm behind it is not one.
  company               VARCHAR(160)  NOT NULL,

  -- 'Founder, Practice Lead…' - the form's own placeholder, and optional
  -- there, so optional here.
  role                  VARCHAR(120),

  -- 'CA · IT firm · Consultant' - what kind of practice they are applying
  -- from. Free text and optional, exactly as the form offers it; NOT an enum,
  -- because the page's own placeholder lists three examples out of a field
  -- that also holds HR advisors and industry associations, and a closed list
  -- would refuse the fourth kind of partner nobody thought of.
  background            VARCHAR(160),

  -- Required: the whole promise of this programme is that somebody calls back.
  -- Wide and permissive for the reason contact_enquiries.phone and
  -- career_applications.phone are - a visitor types their number the way they
  -- say it, country code, spaces, brackets and all, and refusing that shape
  -- loses the partner. Sized to VISITOR_PHONE_MAX in core/utils/visitor-phone.
  mobile                VARCHAR(40)   NOT NULL,

  -- CITEXT like admins.email, contact_enquiries.work_email and
  -- career_applications.email: two people who type the same address in
  -- different cases are one address when the list is searched.
  work_email            CITEXT        NOT NULL,

  -- Triage only, never shown on the public site and never echoed back to the
  -- submitter: enough to tell a burst of spam from a real run of interest.
  submitted_ip          INET,
  submitted_user_agent  TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT partner_program_applications_required_not_blank_check
    CHECK (
      btrim(full_name) <> '' AND btrim(company) <> ''
      AND btrim(mobile) <> '' AND btrim(work_email::text) <> ''
    ),

  -- A last line of defence, not the format check: that is the validator's, and
  -- it reports which field is wrong to the applicant who can fix it.
  CONSTRAINT partner_program_applications_work_email_shape_check
    CHECK (work_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- The list is read newest first and in no other order, so one index covers the
-- table, the date-range filter and the pagination's COUNT(*) OVER().
CREATE INDEX partner_program_applications_created_idx
  ON partner_program_applications (created_at DESC);
