// src/modules/contact-page/types/contact-details.types.ts

/** One entry in the "Where we are" card: a place, and a line about it. */
export interface ContactOffice {
  name: string;
  detail: string;
}

/**
 * The two side cards beside the enquiry form, exactly as stored. A singleton.
 *
 * These values used to live in the website's src/data/company.js, which the
 * rest of the site still uses; the contact page simply stops reading it for
 * the lines an admin now owns.
 */
export interface ContactDetailsSection {
  /** Card one's heading ('Where we are'). */
  officesTitle: string;
  /** Card one's entries, in the order they are listed. */
  offices: ContactOffice[];
  /** Card two's heading ('Direct lines'). */
  directTitle: string;
  email: string;
  phone: string;
  /** As authored; the site strips non-digits when it builds the wa.me link. */
  whatsapp: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin shape. Identical to the stored row: this section has no image and
 * no heading markup, so there is nothing to resolve. It exists so all three
 * Contact sections' services expose the same three shapes.
 */
export type ResolvedContactDetailsSection = ContactDetailsSection;

/** The website-facing shape: no timestamps or authorship. */
export interface PublicContactDetailsSection {
  officesTitle: string;
  offices: ContactOffice[];
  directTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
}

/** PUT body. A full replace of both cards. */
export interface ReplaceContactDetailsSectionInput {
  officesTitle: string;
  offices: ContactOffice[];
  directTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
}
