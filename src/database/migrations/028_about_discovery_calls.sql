-- About page: the discovery calls the form at the foot of /about produces.
--
-- The fourth table in this CMS written by an anonymous visitor and read only
-- inside the admin panel - contact_enquiries is the first, career_applications
-- the second, partner_program_applications the third - and the reasoning there
-- applies here too: there is no mail transport in this project, so the row IS
-- the delivery, and losing it loses the call.
--
-- This one was losing every single booking. The form called submitLead() in the
-- website's src/lib/leads.js, which posts to VITE_LEAD_ENDPOINT if it is set
-- and otherwise resolves successfully having sent nothing anywhere. The visitor
-- was shown "Talk soon" and nobody was ever told. That is the failure this
-- table exists to end.
--
-- The smallest of the four, because the form is deliberately the smallest on
-- the site - 'Three fields. 20 seconds.':
--
--   no email     The form does not ask for one. It asks how to reach you on
--                the phone, because the thing being booked is a phone call.
--   no file      Nothing is attached, so nothing here touches storage.
--   no status    The user asked for the list of who asked for a call, not a
--                pipeline. career_applications carries a status because a
--                candidate is triaged over weeks by several people; a
--                discovery call is read once and either dialled or deleted,
--                which is exactly what contact_enquiries and
--                partner_program_applications do - and neither has a status.
--
-- Immutable by design, like all three before it: no updated_at, no updated_by,
-- no trigger. The only writes are the visitor's insert and an admin's delete. A
-- record an administrator could rewrite would stop being evidence of what was
-- actually sent.

CREATE TABLE about_discovery_calls (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The form's 'Name *'. Sized like contact_enquiries.full_name and
  -- partner_program_applications.full_name: the same question of the same kind
  -- of visitor.
  name                  VARCHAR(120)  NOT NULL,

  -- The form's 'Phone / WhatsApp *' - the only way back to this person, which
  -- is why it is the one other required field. Wide and permissive for the
  -- reason the other three public forms' numbers are: a visitor types their
  -- number the way they say it, country code, spaces, brackets and all, and
  -- refusing that shape loses the call. Sized to VISITOR_PHONE_MAX in
  -- core/utils/visitor-phone.
  phone                 VARCHAR(40)   NOT NULL,

  -- The form's 'Business (optional)' - 'Bakery, FMCG, QSR, etc.' is its own
  -- placeholder. Optional there, so nullable here, and free text rather than an
  -- enum for the reason partner_program_applications.background is: the
  -- placeholder lists three examples out of a field that also holds dairies,
  -- co-packers and cloud kitchens, and a closed list would refuse the fourth
  -- kind of business nobody thought of.
  business              VARCHAR(160),

  -- Triage only, never shown on the public site and never echoed back to the
  -- submitter: enough to tell a burst of spam from a real run of interest.
  submitted_ip          INET,
  submitted_user_agent  TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_discovery_calls_required_not_blank_check
    CHECK (btrim(name) <> '' AND btrim(phone) <> '')

  -- No phone shape CHECK. The format check is the validator's, which reports
  -- which field is wrong to the visitor who can fix it, and the shared
  -- visitor-phone rule is deliberately looser than anything a CHECK could
  -- usefully restate - see core/utils/visitor-phone.ts.
);

-- The list is read newest first and in no other order, so one index covers the
-- table, the date-range filter and the pagination's COUNT(*) OVER().
CREATE INDEX about_discovery_calls_created_idx
  ON about_discovery_calls (created_at DESC);
