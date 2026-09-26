// src/modules/blog/types/hero-section.types.ts

/**
 * The /blog hero: the one slide HeroSlider shows above the featured post. A
 * singleton.
 *
 * Copy and two button labels only. Where the buttons go is not authored: the
 * site fixes it in code (BlogPage.jsx: primary -> /demo, secondary ->
 * /knowledgebase), so there is no link here to get wrong. The backdrop is not
 * here either: the page has never had hero photography of its own - it
 * borrows the site's shared hero artwork - and a slot for one would be a field
 * nobody has anything to put in.
 */
export interface BlogHeroSection {
  /** The small caps line above the headline ('THE UPWON BLOG'). */
  eyebrow: string;
  /** Plain text - HeroSlider draws the headline as written. */
  heading: string;
  subtext: string;
  /** The primary button's text ('Request a Demo'). */
  primaryCtaLabel: string;
  /** The secondary button's text ('Browse the Knowledgebase'). */
  secondaryCtaLabel: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape. Nothing is derived, so it is the stored row. */
export type ResolvedBlogHeroSection = BlogHeroSection;

/** The website-facing shape: no timestamps or authorship. */
export interface PublicBlogHeroSection {
  eyebrow: string;
  heading: string;
  subtext: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

/** PUT body. A full replace - every field is required. */
export interface ReplaceBlogHeroSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}
