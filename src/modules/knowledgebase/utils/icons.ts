// src/modules/knowledgebase/utils/icons.ts

import { BLOG_CATEGORY_ICON_NAMES, isBlogCategoryIconName } from '../../blog/utils/icons';

/**
 * The icons an administrator may pick for a knowledgebase category card, by
 * name - the Blog's allowlist, reused rather than copied.
 *
 * The site draws a category's icon as a lucide-react component, which a
 * database cannot hold, so a category stores the name and the site maps it
 * back through a lookup of exactly these keys - the same lookup the blog chips
 * use (the website's src/lib/blogIcons.js). The three icons data/knowledgebase.js
 * draws today (Boxes, ShieldCheck, Truck) are all on the Blog's list already,
 * and a second list would only be a second place for the panel's picker, the
 * validator and the site's lookup to drift apart.
 *
 * If the knowledgebase ever needs an icon the blog should not offer, this is
 * where its own list starts - with the admin panel's mirror and the website's
 * lookup changed to match.
 */
export const KB_CATEGORY_ICON_NAMES = BLOG_CATEGORY_ICON_NAMES;

export const isKbCategoryIconName = isBlogCategoryIconName;
