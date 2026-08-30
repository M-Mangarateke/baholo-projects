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
| Google Apps Script | Public form receiver and email automation | `/exec` URL in `site-config.js` after deployment | Executes as owner; source in `apps-script/` |
| Google Sheets | Private lead register and system log | Opened only by Apps Script | Never publish or expose the Sheet ID in page code |
| Google mail service | Admin and visitor enquiry emails | Called by Apps Script | Monitor quota and delivery failures |
| WhatsApp | Optional visitor handoff | `wa.me` link to the published business number | Website records click only, never conversation content |

Record the named owner, backup owner, MFA/recovery arrangements and billing
contact for each service in the organisation's private password manager or
service inventory.
