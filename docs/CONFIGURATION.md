# Configuration and environment

The website has no server runtime and therefore no deployment-time environment
variables. `site-config.js` contains public browser configuration:

| Key | Purpose | Secret? |
| --- | --- | --- |
| `LEAD_ENDPOINT_URL` | Deployed Apps Script `/exec` form receiver | No; public endpoint, but set only after validation |
| `FORM_VERSION` | Version recorded with each enquiry | No |
| `PRIVACY_VERSION` | Notice version accepted by the visitor | No |
| `GA_MEASUREMENT_ID` | GA4 production web-stream identifier | No |

Google account credentials, OAuth client secrets, service-account files,
private keys and recovery codes must never be added to this file.

Private lead-backend settings are Google Apps Script Properties:

| Property | Purpose |
| --- | --- |
| `SPREADSHEET_ID` | Private lead workbook created/reused by `setup()` |
| `NOTIFICATION_EMAIL` | Administrator recipient and visitor reply-to |
| `TARGET_ORIGIN` | Exact production origin for `postMessage` |

Private admin-portal settings live in the separate Apps Script project:

| Property | Purpose |
| --- | --- |
| `LEADS_SPREADSHEET_ID` | Existing private workbook; never expose it in page code |
| `GA4_PROPERTY_ID` | Numeric property used by the read-only Data API |
| `ADMIN_USERS_JSON` | Initial owner/manager/officer allowlist; private configuration only |
| `MAGIC_LINK_TTL_MINUTES` | Optional 5–30 minute override; default 15 |
| `SESSION_TTL_HOURS` | Optional 1–24 hour override; default 8 |

The admin deployment URL is operational configuration, not a credential, but
it should remain out of public navigation. Access still depends on the private
allowlist and a valid short-lived session.

When the public privacy notice changes materially, update `PRIVACY_VERSION`,
the visible version date and the relevant documentation in the same release.
