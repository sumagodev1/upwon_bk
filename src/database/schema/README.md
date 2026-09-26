# Schema reference

`src/database/migrations/` is the **single source of truth** for the schema.
Reference copies are deliberately not kept here: two copies of the same DDL
drift, and the copy is always the one that is wrong.

To see the live schema:

```bash
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > schema.sql
```

To see what has been applied:

```bash
npm run migrate:status
```

## Tables

| Migration | Tables |
|---|---|
| `001_extensions.sql` | `citext`, `set_updated_at()` trigger function |
| `002_admins.sql` | `admins` |
| `003_roles_permissions.sql` | `roles`, `permissions`, `admin_roles`, `role_permissions` |
| `004_admin_sessions.sql` | `admin_sessions`, `password_reset_tokens` |
| `005_organizations.sql` | `organizations` |
| `006_plans_subscriptions.sql` | `plans`, `subscriptions` |
| `007_audit_logs.sql` | `audit_logs` |
| `008_settings_notifications.sql` | `settings`, `notifications` |
| `009_api_keys_files.sql` | `api_keys`, `api_key_scopes`, `files` |
| `010_home_page_hero.sql` | `home_hero_slides` |
| `011_home_page_hero_mobile_image.sql` | `home_hero_slides` mobile image columns |
| `012_insider_page_hero.sql` | `insider_hero_slides` |
| `013_insider_page_issues.sql` | `insider_issues`, `insider_stories` |
| `014_insider_page_feature.sql` | `insider_feature_section` (singleton) |
| `015_contact_page_hero.sql` | `contact_hero_section` (singleton) |
| `016_contact_page_form.sql` | `contact_form_section` (singleton) |
| `017_contact_page_details.sql` | `contact_details_section` (singleton) |
| `018_contact_enquiries.sql` | `contact_enquiries` (written by visitors, read only in the admin panel) |
| `019_career_vacancies.sql` | `career_vacancies` |
| `020_career_applications.sql` | `career_applications` (written by applicants, read only in the admin panel; the resume itself lives in `files` and is never publicly servable) |
| `021_partner_program_hero.sql` | `partner_program_hero` (singleton) |
| `022_partner_program_applications.sql` | `partner_program_applications` (written by applicants, read only in the admin panel) |
| `023_about_page_hero.sql` | `about_hero_section` (singleton; its rotating backdrops are a `jsonb` list) |
| `024_about_page_founder_note.sql` | `about_founder_note` (singleton) |
| `025_about_page_team.sql` | `about_team_section` (singleton), `about_team_members` |
| `026_about_page_numbers.sql` | `about_numbers_section` (singleton), `about_number_stats` |
| `027_about_page_cta.sql` | `about_cta_section` (singleton) |
| `028_about_discovery_calls.sql` | `about_discovery_calls` (written by visitors, read only in the admin panel) |
| `029_partner_program_hero_mobile_image.sql` | `partner_program_hero` mobile image columns (supersedes 021's note that the site had nowhere to read a second crop from) |
| `030_about_page_hero_backdrop_mobile_image.sql` | `about_hero_section.backdrops` entries gain an optional mobile pair - a comment-only migration; the entry shape lives in `jsonb` and is enforced by the validator, so `mobileImageFileId` is not an FK either and a purged upload leaves a second dangling id per entry - 023 names the same trade-off for `imageFileId` |
| `031_about_page_cta_mobile_image.sql` | `about_cta_section` mobile image columns (supersedes 027's note that the narrow layout's portrait artwork should stay in the website's code) - **its two column comments, and the `(max-width: 1023px)` and 900x1800 figures in its body, are corrected by 032; read that one too** |
| `032_about_page_cta_mobile_image_comments.sql` | comment-only: re-issues `about_cta_section`'s two mobile column comments. 031 recorded the breakpoint as a round `<= 1023px` (the site's `<source>` is `(max-width: 1023.98px)`, and the `.98` is what stops a fractional 1023.2 CSS px viewport being handed the wide banner) and said a NULL "falls back to the desktop image" (it does not - the narrow layout falls back to the website's own `about_us_cta_mobile.webp`, and the desktop banner is never shown below 1024px). 031's `ctaMobile` figure of 900x1800 is likewise now 840x1680 in `utils/about-image-spec.ts` - same 1:2 target, floor lowered so the 849x1852 house file clears the slot built to supersede it |
