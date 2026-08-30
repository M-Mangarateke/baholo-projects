# Baholo lead backend

This directory is the authoritative source copy for the Google Apps Script web
app that receives website quote enquiries. The live script and private workbook
should be owned by the Baholo administration account.

The browser never receives Google credentials or Sheet access. It submits a
normal HTML form to the public Apps Script web-app URL in a hidden iframe. The
script validates and stores the lead, sends emails, then returns a tightly
scoped `postMessage` acknowledgement to the production website.

## Deployment

1. Create a standalone Apps Script project.
2. Replace the default editor content with `Code.gs` and set the project name to
   `Baholo Projects Lead Backend`.
3. In **Project Settings**, enable the manifest and replace it with
   `appsscript.json` if the editor does not already use the listed settings.
4. Run `setup()` once and approve the requested Google Sheets and send-mail
   permissions. `openById()` requires the Sheets scope even though the script
   uses only the private Sheet ID stored by `setup()`. On first run, `setup()`
   creates `Baholo Projects Website Leads` in the owner's Drive.
5. Open the created workbook from Drive and confirm the `Leads` and `System Log`
   tabs exist. Keep the Sheet private.
6. Deploy as a web app, executing as the owner, with access set to **Anyone**
   (no visitor sign-in required).
7. Copy the `/exec` deployment URL into `LEAD_ENDPOINT_URL` in
   `site-config.js`. The URL is a public endpoint, not an account credential.
8. Commit and deploy the website, then perform the end-to-end test in the forms
   documentation.

Do not publish the Sheet, share it using “anyone with the link,” or place OAuth
client secrets, API keys, service-account files or Google account credentials in
this repository.

## Script properties

`setup()` creates these Script Properties:

| Property | Purpose | Default |
| --- | --- | --- |
| `SPREADSHEET_ID` | Private destination workbook | Bound Sheet ID |
| `NOTIFICATION_EMAIL` | Administrator notifications and visitor reply-to | `info@baholoprojects.co.za` |
| `TARGET_ORIGIN` | Allowed parent origin for the iframe acknowledgement | `https://www.baholoprojects.co.za` |

Change a property in Apps Script Project Settings when the operational owner
changes. Do not put passwords or private API material in these properties.

## Controls

- server-side length, format, service-list and consent validation;
- honeypot rejection;
- minimum form age and expiring browser submission token;
- six-hour replay suppression for an already processed submission token;
- four submissions per email address per hour;
- a 30-accepted-submission global hourly ceiling to protect Apps Script and
  Mail quotas during distributed abuse;
- 15-minute duplicate suppression for identical email/service/message data;
- script locking around replay, rate, duplicate and row-write operations;
- email delivery after the database lock is released, preventing slow mail
  delivery from blocking otherwise valid submissions;
- query-free page/referrer storage and bounded UTM fields;
- HTML escaping in emails;
- private error logging with non-sensitive public responses;
- acknowledgement restricted to the canonical production origin.

Apps Script cannot reliably expose the visitor IP address, so rate limiting is
keyed to a one-way email hash. If abuse becomes material, add a server-verified
bot-challenge provider rather than embedding a secret in client JavaScript.
