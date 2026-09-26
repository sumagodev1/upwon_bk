// src/database/seeds/partner-program.data.ts

/**
 * The Partner Program page hero the website previously held as props on its
 * shared <PageHero>, so /partners renders identically the moment it starts
 * reading from the API. Source, on the website:
 *
 *   src/pages/Partners/PartnersPage.jsx - the <PageHero> call near the top
 *
 * Every string below is verbatim, em dash included: a seed that "tidied" the
 * copy would show up as a diff on a live page the first time it is run.
 *
 * The one thing that changes shape is the headline, because the page wrote it as
 * JSX - a text node, a <br />, and a <span className="gradient-text-orange">
 * around the second line. That is exactly what the home page's heading markup
 * (modules/home-page/utils/heading-markup) expresses as text:
 *
 *   'Your clients need this.'                    ->  line one, plain
 *   <br />                                       ->  the newline
 *   <span className="gradient-text-orange">…      ->  **…**
 *
 * No image. The hero has never had one - it renders on PageHero's ambient cream
 * background today - and seeding a photograph would change the live page on the
 * first migrate, which is precisely what a seed must not do. The admin's Hero
 * Section tab is where a backdrop gets uploaded, and PageHero only switches to
 * its photo-and-scrim treatment once one exists.
 *
 * No applications are seeded either. Every row in partner_program_applications
 * is a real person who really applied, and inventing a few would put fake names,
 * mobile numbers and work addresses in front of an admin who has no way to tell
 * them from the real thing - the same reason careers.data.ts seeds no
 * applications.
 *
 * The three partnership models, the earnings calculator and the FAQ on that page
 * are not here: they stay static in the website's own code and have no section
 * in this CMS.
 */

export interface SeedPartnerProgramHero {
  /** The pill above the headline. */
  eyebrow: string;
  /**
   * Authored in the home page heading markup: a newline is a line break,
   * **like this** is the orange accent. The site's own copy is two lines with
   * the whole second line accented.
   */
  heading: string;
  subtext: string;
}

export const PARTNER_PROGRAM_HERO: SeedPartnerProgramHero = {
  eyebrow: 'UpWon Channel Partner Program',
  heading: 'Your clients need this.\n**You can earn from introducing them.**',
  subtext:
    'IT firms, CAs, food consultants, HR advisors and industry associations — introduce UpWon to businesses in your network. You introduce. We close and implement. You earn.',
};
