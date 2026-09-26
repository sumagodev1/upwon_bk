// src/modules/about-page/types/founder-note.types.ts

/**
 * The founder's note beside the portrait card, exactly as it is stored. A
 * singleton.
 *
 * These values used to come from the website's src/data/company.js
 * (COMPANY.founder), which the rest of the site still uses; the About page
 * simply stops reading it for the lines an admin now owns.
 */
export interface AboutFounderNote {
  founderName: string;
  /** The line under the name on the card ('Founder & CEO'). */
  founderRole: string;
  /** The small orange line under that ('Founder of Byte Elephants Technologies'). */
  companyLine: string;
  /** The pull-quote. Stored without the quote marks the site draws around it. */
  quote: string;
  /** The paragraph under the quote. */
  body: string;
  /** An absolute URL or a site-relative path. Mutually exclusive with photoFileId. */
  photoUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with photoUrl. */
  photoFileId: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the resolved photo URL. */
export interface ResolvedAboutFounderNote extends AboutFounderNote {
  photo: string | null;
}

/** The website-facing shape: no ids, timestamps, or authorship. */
export interface PublicAboutFounderNote {
  founderName: string;
  founderRole: string;
  companyLine: string;
  quote: string;
  body: string;
  /**
   * Null keeps today's initials monogram on the card. The site derives those
   * initials itself - see the service for why they are not returned here.
   */
  photo: string | null;
  /** Not authored: derived from the name and role, so a portrait is never unlabelled. */
  photoAlt: string | null;
}

/** PUT body. A full replace: an absent nullable field is stored as null. */
export interface ReplaceAboutFounderNoteInput {
  founderName: string;
  founderRole: string;
  companyLine: string;
  quote: string;
  body: string;
  photoUrl: string | null;
  photoFileId: string | null;
}
