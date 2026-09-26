-- Contact page: the enquiries visitors submit through the form on /contact.
--
-- Every other table in this CMS is content an admin authors and the website
-- reads. This one runs the other way: it is written by an anonymous visitor
-- and read only inside the admin panel. It is also the delivery mechanism -
-- there is no mail transport in this project, so the row IS the enquiry, and
-- losing it loses the lead.
--
-- The three choice columns store the LABEL the visitor picked rather than a
-- foreign key. contact_form_section keeps those lists as ordered jsonb strings
-- with no identity of their own, and an admin who later renames or drops a
-- label must not silently rewrite what somebody actually answered.
--
-- Immutable by design: no status, no updated_at, no updated_by, no trigger.
-- The only writes are the visitor's insert and an admin's delete; an enquiry
-- that could be edited in the panel would stop being evidence of what was
-- sent.

CREATE TABLE contact_enquiries (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name             VARCHAR(120)  NOT NULL,

  -- CITEXT like admins.email: two visitors who type the same address in
  -- different cases are one address when the inbox is triaged or searched.
  work_email            CITEXT        NOT NULL,

  -- Optional, and wider than admins/contact_details_section allow, because a
  -- visitor types their number the way they say it - country code, spaces,
  -- brackets, extensions - and refusing that shape loses the enquiry.
  phone                 VARCHAR(40),

  company               VARCHAR(160)  NOT NULL,
  role                  VARCHAR(120),

  -- One published option each. Sized to the choice limit the form section's
  -- validator enforces (CHOICE_MAX = 60).
  business_type         VARCHAR(60)   NOT NULL,
  revenue_range         VARCHAR(60)   NOT NULL,

  -- The platforms ticked, as an ordered jsonb array of labels. Zero is a legal
  -- answer: "I don't know yet" is exactly the enquiry sales wants.
  platforms             JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- "What are you trying to solve?" - the free-text answer, optional.
  message               TEXT,

  -- Triage only, never shown on the public site and never echoed back to the
  -- submitter: enough to tell a burst of spam from a real run of interest.
  submitted_ip          INET,
  submitted_user_agent  TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT contact_enquiries_platforms_is_array_check
    CHECK (jsonb_typeof(platforms) = 'array'),

  CONSTRAINT contact_enquiries_required_not_blank_check
    CHECK (
      btrim(full_name) <> '' AND btrim(work_email::text) <> ''
      AND btrim(company) <> '' AND btrim(business_type) <> ''
      AND btrim(revenue_range) <> ''
    ),

  -- A last line of defence, not the format check: that is the validator's, and
  -- it reports which field is wrong to the visitor who can fix it.
  CONSTRAINT contact_enquiries_work_email_shape_check
    CHECK (work_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- The inbox is read newest first and in no other order, so one index covers
-- the list, the date-range filter and the pagination's COUNT(*) OVER().
CREATE INDEX contact_enquiries_created_idx
  ON contact_enquiries (created_at DESC);
