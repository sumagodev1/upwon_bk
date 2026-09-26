-- Partner Program hero: a second image, for narrow viewports.
--
-- SUPERSEDES THE NOTE IN 021_partner_program_hero.sql. That migration argued
-- there was no point in a second crop because <PageHero> renders bgImages as
-- one <img> at 100vw with no <picture> and no breakpoint, so the site had
-- nowhere to read a mobile column from. The website now gives PageHero an
-- optional mobile source - the same <picture> the home and Insider heroes already
-- use, with a `media="(max-width: 539px)"` <source> (narrower than their 767px
-- because this band has no min-height and is landscape again by ~540px, so above
-- that the wide file is the better fit - see utils/partner-image-spec.ts) - so
-- that argument no longer holds. 021 is applied and stays as written; this
-- migration is the correction.
--
-- Why it matters here: the backdrop is object-cover under a navy scrim, and on
-- a phone the band measures 375x525 CSS px (measured on the running page) -
-- portrait, against a desktop crop authored at 2:1. One wide file on a phone is
-- therefore cropped to a narrow vertical sliver of its middle, which is usually
-- where the composition was. A portrait crop authored for mobile avoids that,
-- and because the browser picks the <source> before any of our code runs, a
-- phone never downloads the desktop file at all.
--
-- The columns mirror the desktop pair exactly, including the "exactly one, or
-- neither" rule, so both variants behave the same way everywhere. Both stay
-- NULL until somebody uploads a crop, and a NULL mobile image means the desktop
-- one serves every viewport - which is what every published row does today, so
-- this migration changes no page.

ALTER TABLE partner_program_hero
  ADD COLUMN mobile_image_url      VARCHAR(1000),
  ADD COLUMN mobile_image_file_id  UUID REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE partner_program_hero
  ADD CONSTRAINT partner_program_hero_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL);

-- No index on mobile_image_file_id, exactly as there is none on image_file_id:
-- a one-row table is its own index, and the files module's "is this asset still
-- referenced?" question is a single-row scan here.

COMMENT ON COLUMN partner_program_hero.mobile_image_url IS
  'Narrow-viewport backdrop. Falls back to the desktop image when NULL.';
COMMENT ON COLUMN partner_program_hero.mobile_image_file_id IS
  'Narrow-viewport backdrop as an uploaded asset. Exclusive with mobile_image_url.';
