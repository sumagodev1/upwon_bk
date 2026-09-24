-- Let a section's copy have no eyebrow.
--
-- Every home page section carries one, so the column was written NOT NULL. The
-- ERP page's closing band does not - it opens straight on its heading - and
-- inventing an eyebrow to satisfy the column would add a pill to a design that
-- deliberately has none.
--
-- The heading and subtext stay required: a section with neither is not
-- authored, which is what a missing row already means.

ALTER TABLE page_section_copy ALTER COLUMN eyebrow DROP NOT NULL;

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_not_blank_check;

-- An absent eyebrow is NULL, never an empty string, so there is one way to
-- represent "no eyebrow" rather than two that render the same.
ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_not_blank_check
    CHECK (
      (eyebrow IS NULL OR btrim(eyebrow) <> '')
      AND btrim(heading) <> ''
      AND btrim(subtext) <> ''
    );
