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

When the public privacy notice changes materially, update `PRIVACY_VERSION`,
the visible version date and the relevant documentation in the same release.
