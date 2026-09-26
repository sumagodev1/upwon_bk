// src/database/seeds/contact-page.data.ts

/**
 * The Contact page content the website previously held in its own files, so
 * /contact renders identically the moment it starts reading from the API.
 * Sources, on the website:
 *
 *   hero      src/pages/Contact/sections/ContactHeroSection/ContactHeroSection.jsx
 *   form      src/pages/Contact/ContactPage.jsx - the copy and the three
 *             choice lists around the enquiry form
 *   details   the two side cards in the same file, whose values came from
 *             src/data/company.js
 *
 * Every string below is verbatim, punctuation included: a seed that "tidies"
 * the copy would show up as a diff on a live page the first time it is run.
 *
 * The closing CTA is not here. It stays static in the website's own code and
 * has no section in this module.
 */

export interface SeedContactHeroSection {
  /**
   * Authored in the home page heading markup (home-page/utils/heading-markup):
   * a newline is a line break, **like this** is the orange accent. The site's
   * own copy is one line with the last two words accented.
   */
  heading: string;
  subtext: string;
  /** The crops the site ships, referenced by path - see the seed for why. */
  imageUrl: string;
  mobileImageUrl: string;
}

export interface SeedContactFormSection {
  eyebrow: string;
  heading: string;
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
  footnote: string;
  successHeading: string;
  successBody: string;
}

export interface SeedContactOffice {
  name: string;
  detail: string;
}

export interface SeedContactDetailsSection {
  officesTitle: string;
  offices: SeedContactOffice[];
  directTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
}

/**
 * The hero, from ContactHeroSection.jsx. The image paths are the site's own
 * files under public/images: a seeded section points at the artwork already
 * shipped with the site, and an upload replaces it from the admin panel.
 */
export const CONTACT_HERO_SECTION: SeedContactHeroSection = {
  heading: 'Let’s Talk About Your **Operations.**',
  subtext:
    'Tell us your industry and your biggest pain point. A solution lead from the UpWon team will get back to you within 2 business hours.',
  imageUrl: '/images/contact_us_desktop.webp',
  mobileImageUrl: '/images/contact_us_mobile.webp',
};

/**
 * The copy and the choices around the enquiry form. The form's inputs, its
 * submit button and the success screen's buttons are behaviour and stay in the
 * website's code, so nothing about them is seeded.
 */
export const CONTACT_FORM_SECTION: SeedContactFormSection = {
  eyebrow: 'Tell us about your business',
  heading: 'One conversation. We take it from there.',
  businessTypes: [
    'Manufacturing',
    'Distribution',
    'Franchise / Retail',
    'Cloud Kitchen / QSR',
    'Multi-vertical Group',
    'Other',
  ],
  revenueRanges: ['< ₹25 Cr', '₹25 – 200 Cr', '₹200 – 1,000 Cr', '₹1,000 Cr+'],
  platforms: [
    'UpWon ERP',
    'UpWon SFA-DMS',
    'UpWon FMS & POS',
    'UpWon HREasy',
    'UpWon WMS',
    'UpWon Vendor Portal',
    'UpWon Mobile Apps',
  ],
  footnote: 'No spam · Response within 2 business hours · No obligation',
  successHeading: "We've got your message.",
  successBody:
    'A UpWon solution lead will reach out within 2 business hours. In the meantime, feel free to explore the platform.',
};

/**
 * The two side cards. The second office entry and the three direct lines were
 * read from COMPANY in src/data/company.js - `parent`, `team` and the three
 * `contact` fields - and are written out here as the text they rendered as.
 */
export const CONTACT_DETAILS_SECTION: SeedContactDetailsSection = {
  officesTitle: 'Where we are',
  offices: [
    { name: 'Nashik · HQ', detail: "Maharashtra · India's food processing belt" },
    {
      name: 'Byte Elephants Technologies Pvt Ltd',
      detail: 'Founded 2016 · 30 senior domain experts',
    },
  ],
  directTitle: 'Direct lines',
  email: 'hello@upwon.in',
  phone: '+91 93568 98277',
  whatsapp: '+919356898277',
};
