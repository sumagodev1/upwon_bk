// src/modules/vs-sap-page/validators/shared.ts

/**
 * The limits both of this page's section singletons are held to - the straight
 * answer and the comparison table's copy - in one place so the two tabs'
 * counters agree.
 *
 * Every number below is also a column size in 053_vs_sap_page.sql and a
 * counter in the admin panel's forms. Changing one means changing all three.
 *
 * The eyebrow is the Blog topics intro's (one small-caps line); the headline is
 * sized to today's copy with room to spare - the longer of the two is under
 * fifty characters. The hero slides are not held to these: they take the Free
 * Audit hero's limits (hero-section.validator).
 */
export const EYEBROW_MIN = 2;
export const EYEBROW_MAX = 60;
export const HEADING_MIN = 3;
export const HEADING_MAX = 200;
