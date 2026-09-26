// src/modules/free-audit/utils/revenue-ranges.ts

/**
 * The four revenue-range chips the /free-audit form renders, exactly as they
 * read - the rupee sign, the en-dash and the thousands comma included - and in
 * the order they are drawn.
 *
 * A closed list, unlike the free-text "business" fields on the other public
 * forms: the visitor cannot type here, only pick one of these four, so anything
 * else in a submission did not come from the page. The website sends the chip's
 * own text, and the admin table shows it back as stored.
 *
 * Restated by the free_audit_applications_revenue_range_check CHECK in
 * 051_free_audit.sql, and by the chip row in the website's FreeAuditPage.jsx.
 * Changing one means changing all three.
 */
export const FREE_AUDIT_REVENUE_RANGES = [
  '< ₹25 Crore',
  '₹25–200 Crore',
  '₹200–1,000 Crore',
  '₹1,000 Crore+',
] as const;

export type FreeAuditRevenueRange = (typeof FREE_AUDIT_REVENUE_RANGES)[number];
