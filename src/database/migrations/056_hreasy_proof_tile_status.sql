-- 056_hreasy_proof_tile_status.sql
--
-- Gives a proof-bento card its own status.
--
-- The card was left without one on purpose when the bento was built: a card
-- reaches the page because a column places it, so taking it off the page was
-- the column's job. In practice that is one step too many - pulling a client's
-- logo from the site meant finding every column drawing it and editing each,
-- rather than switching the card off once.
--
-- What an inactive card means for a column is already decided: a column whose
-- cards cannot all be drawn is dropped rather than published with a hole,
-- because the shapes are fixed and a STACK missing its second card would draw
-- a half-empty column. An inactive card takes the same path - every column
-- placing it falls out of the bento, and comes back when it is reactivated.
--
-- Existing cards default to ACTIVE, which is what they already were.

ALTER TABLE hreasy_proof_tiles
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE hreasy_proof_tiles
  ADD CONSTRAINT hreasy_proof_tiles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- The public read filters on it every time the page is served.
CREATE INDEX hreasy_proof_tiles_status_idx ON hreasy_proof_tiles (status);
