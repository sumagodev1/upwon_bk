// src/modules/blog/types/topics-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The "Insights by Topic" intro above the category chips and the post grid. A
 * singleton.
 *
 * Its own resource rather than a part of the categories' responses, for the
 * reason the About page's section copy is separate from its people: a save of
 * this headline must not be able to reorder or delete a category, and adding
 * a category must not have to resend the headline.
 */
export interface BlogTopicsSection {
  eyebrow: string;
  /** Authored text in the home heading markup: one **accent** span at most. */
  heading: string;
  subtext: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the parsed heading for the preview. */
export interface ResolvedBlogTopicsSection extends BlogTopicsSection {
  headingLines: HeadingLine[];
}

/**
 * The website-facing shape. `heading` travels raw as well as parsed, like
 * every other heading in this API, so a client that only wants plain text can
 * still have it.
 */
export interface PublicBlogTopicsSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
}

/** PUT body. A full replace of the intro's copy. */
export interface ReplaceBlogTopicsSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
}
