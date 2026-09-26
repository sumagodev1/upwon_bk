-- About page closing CTA: a second image, for the narrow layout.
--
-- SUPERSEDES THE NOTE IN 027_about_page_cta.sql. That migration gave the banner
-- ONE image column and argued the phone crop should stay in the website's code,
-- because the narrow layout runs a different composition - a portrait scene with
-- the copy in the clear space under the desk - rather than a second size of the
-- same picture, and a second piece of artwork is a second authoring job nobody
-- had asked for. Somebody has now asked for it. 027 is applied and stays as
-- written; this migration is the correction, and it makes the CTA behave like the
-- two heroes that got their mobile pair alongside it
-- (029_partner_program_hero_mobile_image.sql,
-- 030_about_page_hero_backdrop_mobile_image.sql).
--
-- WHY THE BANNER NEEDS ITS OWN COLUMN RATHER THAN A SMALLER COPY OF THE WIDE ONE.
--
-- <AboutCtaSection> does not resize one picture across the range: it renders TWO
-- BLOCKS and swaps them at Tailwind's `lg`, and they are not the same shape or
-- even the same kind of fit.
--
--   >= 1024px  `hidden lg:block` - the wide artwork at `block h-auto w-full`, so
--              the card is exactly as tall as the file's own ratio makes it
--              (the shipped file is 2048x768, 8:3 = 2.67) and the copy is
--              absolutely positioned over its right half.
--
--   <= 1023px  `block lg:hidden` - a portrait scene at
--              `absolute inset-0 h-full w-full object-cover object-top`, with the
--              copy in normal flow below a `pt-[95%]` spacer, so the block's
--              height is the scene plus however many lines the copy takes.
--
-- Measured on the running page, that narrow block is 327x676 CSS px at a 375px
-- viewport - 0.48:1, PORTRAIT - against a desktop crop authored at 8:3 landscape.
-- Handing object-cover a file five times too wide for that box keeps a narrow
-- vertical sliver of its middle and throws the rest away, which on this banner is
-- the whole scene. Hence a second crop, and an admin slot to publish it into.
--
-- THE BREAKPOINT IS 1024, NOT THE 767 THE SLIDER HEROES USE. The two blocks are
-- separate DOM, so the aspect does not drift across the range and then flip - it
-- flips exactly where the blocks swap. Below it the box goes 0.48 (375) -> 0.51
-- (414) -> 0.57 (480) -> 0.69 (640) -> 0.72 (768) -> 0.81 (1023), all portrait;
-- at 1024 the other block takes over at 2.67. So the site's <source> is
-- media="(max-width: 1023px)", and a crop published here serves tablets as well
-- as phones. utils/about-image-spec.ts sizes the slot around that: 900x1800
-- (1:2), shaped for the phone end of the table, where a wrong ratio costs the
-- sides of the scene, and left wide enough to cover the tablet end, where
-- object-top already crops the picture by design.
--
-- The columns mirror the desktop pair exactly, including the "exactly one, or
-- neither" rule, so both variants behave the same way everywhere. Both stay NULL
-- until somebody uploads a crop, and a NULL mobile image means the desktop one
-- serves every viewport - which is what the published row says today, so this
-- migration changes no page. Nothing is seeded into them either: the house
-- portrait artwork stays in the website's code as the fallback it already is.
--
-- The two slots are independent, as they are on the Partner hero: a banner may
-- carry a phone crop and no desktop image, and vice versa. That is not a state
-- worth refusing here, because each block already falls back to its own built-in
-- artwork on its own - so an unset slot means "keep the house picture for that
-- layout", not "render an empty card".

ALTER TABLE about_cta_section
  ADD COLUMN mobile_image_url      VARCHAR(1000),
  ADD COLUMN mobile_image_file_id  UUID REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE about_cta_section
  ADD CONSTRAINT about_cta_section_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL);

-- No index on mobile_image_file_id, exactly as there is none on image_file_id:
-- a one-row table is its own index, and the files module's "is this asset still
-- referenced?" question is a single-row scan here.

COMMENT ON COLUMN about_cta_section.mobile_image_url IS
  'Banner artwork for the narrow layout (<= 1023px). Falls back to the desktop image when NULL.';
COMMENT ON COLUMN about_cta_section.mobile_image_file_id IS
  'Narrow-layout banner artwork as an uploaded asset. Exclusive with mobile_image_url.';
