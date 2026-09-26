// src/modules/insider-page/types/feature-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/** The long-form feature section exactly as it is stored. A singleton. */
export interface InsiderFeatureSection {
  /** The pill over the image ('Long-form'). Null hides the pill. */
  badge: string | null;
  eyebrow: string;
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  body: string;
  /** The checklist under the paragraph, in order. */
  bullets: string[];
  /** An absolute URL or a site-relative path. Mutually exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with imageUrl. */
  imageFileId: string | null;
  status: ContentStatus;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin shape: the stored row plus the resolved image URL and the parsed
 * heading, so the form can round-trip the raw fields and preview the result.
 */
export interface ResolvedInsiderFeatureSection extends InsiderFeatureSection {
  image: string | null;
  headingLines: HeadingLine[];
}

/** The website-facing shape. Served only while the section is ACTIVE. */
export interface PublicInsiderFeatureSection {
  badge: string | null;
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  body: string;
  bullets: string[];
  image: string | null;
  /** Not authored: the heading, so an image is never announced unlabelled. */
  imageAlt: string | null;
}

/** PUT body. A full replace: an absent nullable field is stored as null. */
export interface ReplaceInsiderFeatureSectionInput {
  badge: string | null;
  eyebrow: string;
  heading: string;
  body: string;
  bullets: string[];
  imageUrl: string | null;
  imageFileId: string | null;
  status: ContentStatus;
}
