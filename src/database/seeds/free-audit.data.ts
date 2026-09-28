// src/database/seeds/free-audit.data.ts

/**
 * The /free-audit hero the website previously held as static data, so the page
 * renders identically the moment it starts reading from the API, and the admin
 * panel shows today's content from its first run. Source, on the website:
 *
 *   hero   HERO_SLIDES in src/pages/FreeAudit/FreeAuditPage.jsx - the one
 *          slide's eyebrow, headline, subhead and backdrop (its two buttons,
 *          and where they go, stay in the page's code)
 *
 * Every string below is verbatim, dashes and middle dots included: a seed that
 * "tidied" the copy would show up as a diff on the live page the first time it
 * is run. The keys are renamed to the columns they fill (headline -> heading,
 * subhead -> subtext, bg -> imageUrl), and nothing else changes.
 *
 * imageUrl fills free_audit_hero_slides.image_url, which is legacy / seed-only:
 * the admin API takes a picture as an upload and never writes a URL into it,
 * and this picture - the site's shared hero artwork - has no uploaded file
 * behind it, so the seed is the only place it comes from. The slide's first
 * upload replaces it.
 *
 * Not seeded: the hero's accent colour, which stays in the page's code, and a
 * phone crop (mobile_image_file_id) - the page has none, so the seeded slide
 * serves its one picture at every width until somebody uploads one.
 *
 * No audit requests are seeded. Every row in free_audit_applications is a real
 * visitor's request, and an invented one would sit in the inbox looking like a
 * lead somebody should call.
 */

export interface SeedFreeAuditHeroSlide {
  eyebrow: string;
  heading: string;
  subtext: string;
  /** The seeded backdrop (image_url - legacy / seed-only, see above). */
  imageUrl: string;
}

export const FREE_AUDIT_HERO_SLIDES: SeedFreeAuditHeroSlide[] = [
  {
    eyebrow: 'FREE · 60 MINUTES · NO COMMITMENT',
    heading: 'A Free Operational Audit for Your Food or FMCG Business.',
    subtext:
      'Not a sales call. A genuine audit of where your operations are leaking margin — and what a fix would look like. You walk away with a written blueprint either way.',
    imageUrl: '/images/home_hero_bg.webp',
  },
];
