-- Corrects the two column comments 031 shipped on about_cta_section. Comments
-- only: no DDL, no data, no page changes.
--
-- 031 IS APPLIED AND STAYS AS WRITTEN. This is the follow-up that amends what it
-- put into the schema, because the schema is what a DBA reads - \d+
-- about_cta_section, not the migration file - and both of its sentences were
-- wrong in a way that would mislead the next person to change this section.
--
-- WHAT 031 GOT WRONG, ITEM BY ITEM.
--
--   THE BREAKPOINT. 031 recorded "(<= 1023px)", and its body quoted the site's
--   <source> as media="(max-width: 1023px)". The website uses
--   (max-width: 1023.98px), and the .98 is load-bearing rather than cosmetic.
--   Tailwind's `lg:` is (min-width: 1024px), so the widths the narrow block is
--   VISIBLE at are every width BELOW 1024 - not every width up to a round 1023.
--   Viewport widths are fractional whenever the device pixel ratio is not a whole
--   number, which on Windows at 125% scaling is the ordinary case: a 1279px window
--   reports 1023.2 CSS px. At 1023.2 neither (min-width: 1024px) nor
--   (max-width: 1023px) matches, so the portrait block is displayed while the
--   <picture> resolves to the WIDE 2048x768 banner and paints it object-cover into
--   a 0.81 portrait box - the exact failure the second column exists to prevent.
--   A reader who took 031's round 1023 as the contract and "corrected"
--   MOBILE_SOURCE_MEDIA in AboutCtaSection.jsx to match would reintroduce it.
--
--   THE FALLBACK. 031 recorded "Falls back to the desktop image when NULL." It
--   does not. <AboutCtaSection> resolves the two slots separately
--   (`cta.mobileImage || BG_MOBILE`), so a NULL here leaves the narrow layout on
--   the website's own built-in portrait artwork,
--   public/images/about_us_cta_mobile.webp. That is the whole point of a second
--   composition: below 1024px the desktop banner is never shown, because
--   object-cover would keep a centre sliver of it. NULL means "keep the house
--   portrait picture", not "use the wide one".
--
-- ALSO SUPERSEDED, though it is prose rather than schema: 031's body says
-- utils/about-image-spec.ts sizes the slot at 900x1800. It is now 840x1680 - the
-- same 1:2 target and the same 0.25 tolerance, with the floor lowered so that the
-- house file above (849x1852) clears the slot that exists to supersede it. A 900
-- floor refused it by 51px, and refused it on SIZE, so the message never reached
-- the shape. The derivation is in about-image-spec.ts; src/database/schema/README.md
-- carries the pointer.
--
-- Nothing here touches about_cta_section's row, its columns, its constraint or its
-- FK. Re-issuing COMMENT ON COLUMN replaces the stored text outright.

COMMENT ON COLUMN about_cta_section.mobile_image_url IS
  'Banner artwork for the narrow layout - every width below 1024px; the site''s <source> is (max-width: 1023.98px). NULL means the website keeps its own built-in portrait artwork for that layout; it does NOT fall back to the desktop banner, which is a different composition and is never shown below 1024px.';

COMMENT ON COLUMN about_cta_section.mobile_image_file_id IS
  'Narrow-layout banner artwork as an uploaded asset. Exclusive with mobile_image_url; NULL behaves as described there.';
