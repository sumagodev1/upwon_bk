-- Clients page CMS: the full case study behind each featured card.
--
-- /clients/:slug (Monginis, Kaka Halwai, U2 Cake) is the long form of a card
-- on /clients, about the same client, so it lives on the same row rather than
-- in a table of its own: one case study, edited in one form, and the card's
-- figures and the story's "Headline outcomes" are the same list - the card
-- shows the first three, the story shows them all (up to six).
--
-- Every column is nullable: a card with no slug has no story page, which is
-- what every row created before this migration is until someone writes one.

ALTER TABLE clients_case_cards
  -- The URL segment: /clients/<slug>. NULL means the card has no story page.
  ADD COLUMN slug                VARCHAR(100),
  -- The hero's meta line, after the scale ('30-day go-live · ...').
  ADD COLUMN duration            VARCHAR(200),
  -- The hero's description under the headline.
  ADD COLUMN challenge_one_line  TEXT,
  -- The paragraph beside the challenges list ("What X Faced Before UpWon").
  ADD COLUMN challenge_summary   TEXT,
  -- [{ "title": "...", "desc": "..." }] - the challenge cards.
  ADD COLUMN challenges          JSONB         NOT NULL DEFAULT '[]'::jsonb,
  -- "How the Decision Was Made."
  ADD COLUMN why_upwon           TEXT,
  -- [{ "week": "Week 1", "title": "...", "detail": "..." }] - the timeline.
  ADD COLUMN timeline            JSONB         NOT NULL DEFAULT '[]'::jsonb,
  -- ["Core ERP with batch tracking ...", ...] - the green "Delivered & Live" box.
  ADD COLUMN deliverables        JSONB         NOT NULL DEFAULT '[]'::jsonb,
  -- The closing quote. All three or none, enforced by the validator.
  ADD COLUMN testimonial_quote   TEXT,
  ADD COLUMN testimonial_author  VARCHAR(160),
  ADD COLUMN testimonial_role    VARCHAR(160);

ALTER TABLE clients_case_cards
  ADD CONSTRAINT clients_case_cards_slug_format_check
    CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT clients_case_cards_story_arrays_check
    CHECK (
      jsonb_typeof(challenges) = 'array'
      AND jsonb_typeof(timeline) = 'array'
      AND jsonb_typeof(deliverables) = 'array'
    );

-- One story per URL. Partial, so any number of cards can have no story.
CREATE UNIQUE INDEX clients_case_cards_slug_key
  ON clients_case_cards (slug)
  WHERE slug IS NOT NULL;
