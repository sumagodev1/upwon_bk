-- Careers page: the applications the vacancy popup's Apply Now form produces.
--
-- The second table in this CMS written by an anonymous visitor and read only
-- inside the admin panel - contact_enquiries is the first, and the reasoning
-- there applies here too: there is no mail transport in this project, so the
-- row IS the delivery, and losing it loses the candidate.
--
-- What is different from an enquiry:
--
--   a file      The resume. Stored through the files table like every other
--               upload, but NEVER publicly servable - see the note on
--               PUBLIC_FILE_ENTITY_TYPES in src/config/constants.ts.
--   a status    An enquiry is read once and either acted on or deleted. An
--               application is triaged over weeks by more than one person, so
--               "where has this got to" has to live somewhere that is not
--               somebody's memory.
--
-- What is the same: the candidate's own answers are immutable. There is no
-- endpoint that edits full_name, email, phone, location, experience, message
-- or the resume, because an application an administrator could rewrite would
-- stop being evidence of what the candidate actually sent. Only status moves.

CREATE TABLE career_applications (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SET NULL, not CASCADE. Deleting a filled role must not delete the people
  -- who applied for it: they are the record of a hiring round, and a recruiter
  -- who tidies up the vacancy list should not silently destroy it.
  vacancy_id              UUID          REFERENCES career_vacancies(id) ON DELETE SET NULL,

  -- Which is why the title is copied in at submission time. Once vacancy_id is
  -- NULL this is the only thing left that says what the person applied for,
  -- and it is also what the inbox column shows for a role that has since been
  -- renamed - 'applied for X' should mean the X that was advertised.
  vacancy_title_snapshot  VARCHAR(200)  NOT NULL,

  full_name               VARCHAR(120)  NOT NULL,

  -- CITEXT like admins.email and contact_enquiries.work_email: one address,
  -- however the applicant capitalised it, when the inbox is searched.
  email                   CITEXT        NOT NULL,

  -- Required here, unlike an enquiry's: a recruiter calls a shortlisted
  -- candidate. Wide and permissive for the same reason the enquiry column is -
  -- people type their number the way they say it.
  phone                   VARCHAR(40)   NOT NULL,

  -- Where the candidate is, in their own words ('Nashik', 'Pune, open to
  -- relocating'). Not matched against the vacancy's location - that is a
  -- conversation, not a validation rule.
  location                VARCHAR(120)  NOT NULL,

  -- '4 years', 'Fresher'. Free text, mirroring career_vacancies.experience.
  experience              VARCHAR(60)   NOT NULL,

  -- The CV. SET NULL so a file purged through the files module leaves the
  -- application readable rather than taking it down with it; the inbox then
  -- shows the application with no resume to download, which is the truth.
  resume_file_id          UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- "Anything you'd like to add" - optional, and often the covering letter.
  message                 TEXT,

  -- The recruiter's triage column. Mirrors APPLICATION_STATUSES in
  -- src/config/constants.ts.
  status                  VARCHAR(20)   NOT NULL DEFAULT 'NEW',
  status_updated_at       TIMESTAMPTZ,
  status_updated_by       UUID          REFERENCES admins(id) ON DELETE SET NULL,

  -- Triage only, never shown to the applicant and never echoed back: enough to
  -- tell a burst of scripted noise from a real run of interest in a role.
  submitted_ip            INET,
  submitted_user_agent    TEXT,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT career_applications_status_check
    CHECK (status IN ('NEW', 'IN_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED')),

  CONSTRAINT career_applications_required_not_blank_check
    CHECK (
      btrim(vacancy_title_snapshot) <> '' AND btrim(full_name) <> ''
      AND btrim(email::text) <> '' AND btrim(phone) <> ''
      AND btrim(location) <> '' AND btrim(experience) <> ''
    ),

  -- A last line of defence, not the format check: that belongs to the
  -- validator, which can tell the applicant which field is wrong.
  CONSTRAINT career_applications_email_shape_check
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- The inbox is read newest first; one index covers the list, the date-range
-- filter and the pagination's COUNT(*) OVER().
CREATE INDEX career_applications_created_idx
  ON career_applications (created_at DESC);

-- "How many people applied for this role", on the admin vacancy table, and the
-- per-vacancy filter on the inbox.
CREATE INDEX career_applications_vacancy_idx
  ON career_applications (vacancy_id);
