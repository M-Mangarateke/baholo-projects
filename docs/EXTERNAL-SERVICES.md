# External services register

This register records purpose and connection points, never credentials.

| Service | Purpose | Website connection | Operational note |
| --- | --- | --- | --- |
| GoDaddy | Registrar and authoritative DNS | A/AAAA apex, `www` CNAME, Google verification TXT, retained Workspace email records | Preserve MX/SPF and verification records |
| GitHub | Source, history, Actions and Pages | `M-Mangarateke/baholo-projects`, `main`, custom domain | Require accountable admin access and MFA |
| GitHub Pages | Static hosting, TLS and redirects | Canonical `https://www.baholoprojects.co.za/` | HTTPS enforced |
| Google Search Console | Domain ownership, crawl/index monitoring | Domain property and sitemap | Verification TXT must remain |
| Google Analytics 4 | Consented aggregate measurement | `G-MKR7FTEKE8`; Search Console product link | No PII; `generate_lead` key event |
| Google Business Profile | Search/Maps business entity | Canonical website, phone, hours and services | Draft exists; real-address verification pending |
| Google Apps Script — lead receiver | Public form receiver and visitor/admin email automation | Deployed `/exec` URL in `site-config.js` | Executes as owner; Version 2 acknowledgement bridge verified; source in `apps-script/` |
| Google Apps Script — staff portal | Magic-link staff access, lead operations and GA4 dashboard | Separate private-operational `/exec` URL | Executes as owner; app-level allowlist/session checks; source in `apps-script-admin/` |
| Google Sheets | Private lead register and system log | Opened only by Apps Script | Storage and duplicate suppression verified; never publish or expose the Sheet ID in page code |
| Google mail service | Lead, visitor, magic-link and assignment emails | Called by the two Apps Script projects | Lead/visitor delivery verified; portal paths require deployment validation; monitor quota and failures |
| Google Analytics Data API | Read-only portal reporting | Called server-side by the admin Apps Script project | Enable in its Cloud project; OAuth token never reaches the browser |
| WhatsApp | Optional visitor handoff | `wa.me` link to the published business number | Website records click only, never conversation content |

Record the named owner, backup owner, MFA/recovery arrangements and billing
contact for each service in the organisation's private password manager or
service inventory.
