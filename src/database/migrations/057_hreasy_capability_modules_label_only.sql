-- HREasy capabilities section: a module is its label and its panel artwork.
--
-- 056 also gave the module an icon name and a description line, on the
-- reading that the site draws the panel's heading block from data. It does
-- not: the orange icon tile, the repeated heading and the line under it are
-- all inside the panel artwork. Held as columns they would be a second copy
-- of words already baked into the image, and the two would drift.
--
-- So what the CMS holds for this section is the copy above it (once, in
-- page_section_copy), the list down the left, and the image on the right.
--
-- The slug stays: it is how the site keys the selected row, and it has to
-- survive a rename. The artwork stays required - the right side of the
-- section is that image, so a module without one is an empty panel.
--
-- The not-blank check has to be rewritten rather than dropped, because it
-- also covers `name`, which is staying.

ALTER TABLE hreasy_capability_modules
  DROP CONSTRAINT hreasy_capability_modules_not_blank_check;

ALTER TABLE hreasy_capability_modules
  DROP COLUMN icon,
  DROP COLUMN description;

ALTER TABLE hreasy_capability_modules
  ADD CONSTRAINT hreasy_capability_modules_not_blank_check
    CHECK (btrim(name) <> '');
