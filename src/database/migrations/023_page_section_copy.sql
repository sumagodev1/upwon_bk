-- Generalise the shared section copy from "the home page" to "any page".
--
-- 021 introduced home_section_copy so an eyebrow, heading and subtext are
-- authored once per section rather than repeated on every entry. That table
-- was keyed by section alone, which was right while the home page was the only
-- page in the CMS - it stops being right the moment a second page has a
-- section also called 'hero', 'trust', 'faq' or 'cta', which the ERP product
-- page does for all four.
--
-- So the key becomes (page_key, section_key). Existing rows are all the home
-- page's, and are stamped as such.

ALTER TABLE home_section_copy RENAME TO page_section_copy;

-- Constraints and indexes keep their old names through a RENAME, which would
-- leave 'home_' prefixes on a table that is no longer home-specific.
ALTER TABLE page_section_copy
  RENAME CONSTRAINT home_section_copy_key_check TO page_section_copy_section_key_check;
ALTER TABLE page_section_copy
  RENAME CONSTRAINT home_section_copy_not_blank_check TO page_section_copy_not_blank_check;
ALTER TRIGGER home_section_copy_set_updated_at ON page_section_copy
  RENAME TO page_section_copy_set_updated_at;

-- Added nullable, backfilled, then made NOT NULL: the column has no sensible
-- default for future rows, but every row that exists now is the home page's.
ALTER TABLE page_section_copy ADD COLUMN page_key VARCHAR(40);
UPDATE page_section_copy SET page_key = 'home';
ALTER TABLE page_section_copy ALTER COLUMN page_key SET NOT NULL;

-- The primary key moves from the section alone to the pair.
ALTER TABLE page_section_copy DROP CONSTRAINT home_section_copy_pkey;
ALTER TABLE page_section_copy ADD PRIMARY KEY (page_key, section_key);

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp'));

-- Widened for the ERP page's own sections. The pair is what is unique now, so
-- 'hero' on the ERP page and 'hero' on the home page are different rows - and
-- the home page's hero deliberately has no row at all, because its slides each
-- carry their own copy.
ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
      -- home page
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      -- ERP product page
      'hero', 'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers'
    ));
