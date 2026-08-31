# Baholo Operations admin web app

This directory is a separate Google Apps Script project for authorised Baholo
staff. It reads the existing private lead workbook, provides audited lead
management, and presents read-only Google Analytics 4 reports through the GA4
Data API. It is intentionally isolated from the public form receiver in
`../apps-script/`.

## Trust model

- The web app requires a signed-in Google account, is not linked from the
  public site, and is marked `noindex`. Google sign-in alone does not grant data
  access; the private allowlist and one-time email link remain separate gates.
- Every data method validates a random, server-hashed session token and the
  active user's role. Hiding buttons in the browser is not treated as access
  control.
- Magic links expire after 15 minutes and can be redeemed once. Sessions expire
  after eight hours, remain in the current browser tab, and can be revoked by
  signing out or editing the private `Admin Sessions` sheet.
- The Sheet ID, allowlist, OAuth token and personal owner address stay in Apps
  Script/Google Sheets. They are not embedded in HTML or committed to Git.
- Lead deletion is not exposed. Edits use revision checks and every changed
  field creates a private before/after audit row.
- GA4 access is read-only. The OAuth token obtained by Apps Script is sent only
  to Google's Analytics Data API and never returned to the browser.

## Private Script Properties

Set these in **Project Settings → Script Properties** before running setup:

| Property | Required | Purpose |
| --- | --- | --- |
| `LEADS_SPREADSHEET_ID` | Yes | Existing private workbook used by the public form backend |
| `GA4_PROPERTY_ID` | Yes | Numeric GA4 property ID (`552126734` in production) |
| `ADMIN_USERS_JSON` | Yes for setup | Seed users; configure privately and never commit the production value |
| `MAGIC_LINK_TTL_MINUTES` | No | Override between 5 and 30 minutes; default 15 |
| `SESSION_TTL_HOURS` | No | Override between 1 and 24 hours; default 8 |

Use this shape for `ADMIN_USERS_JSON`:

```json
[
  {"email":"owner@example.com","name":"Owner Name","role":"owner","active":true},
  {"email":"admin@example.com","name":"Administrative User","role":"administrative_officer","active":true},
  {"email":"operations@example.com","name":"Operations User","role":"operations_manager","active":true}
]
```

The production property must use the three approved addresses supplied by
Baholo. Once `setupAdmin_()` has seeded the private `Admin Users` sheet, that
sheet is the runtime allowlist. Re-running setup updates the seeded users.

## Deployment

1. Create a new standalone Apps Script project owned by the accountable Baholo
   administration account.
2. Add `Code.gs`, `Index.html`, `Styles.html`, `App.html`, and the manifest from
   this directory.
3. Set the private Script Properties above.
4. Associate the project with a Google Cloud project and enable **Google
   Analytics Data API**.
5. Run `setupAdmin_()` from the editor and review the requested scopes.
6. Confirm the existing workbook now has `Admin Users`, `Admin Magic Links`,
   `Admin Sessions`, and `Admin Audit`, plus six appended admin columns on
   `Leads`. Existing lead columns and rows are retained.
7. Deploy as a web app that executes as the deploying owner and is accessible
   to anyone signed into Google. The app performs its own allowlist and session
   checks after Google's sign-in gate.
8. Store the `/exec` URL in the private service register and share it only with
   authorised staff. Do not add it to the public website navigation.

Apps Script's `/dev` test URL is editor-only and uses the latest saved code. Use
it for controlled pre-release testing; use the versioned `/exec` deployment for
staff.

## Roles

| Role | Lead access | Analytics | Account configuration |
| --- | --- | --- | --- |
| Owner | View and edit | View | Managed privately in Sheet/Script Properties |
| Operations Manager | View, filter, assign and edit | View | No |
| Administrative Officer | View, filter, assign and edit | View | No |

The initial release deliberately keeps user administration out of the browser.
This prevents a compromised staff session from granting new accounts.

## Lead workflow

Staff can search and filter by status, service, assignee and priority; open a
record; correct contact fields; update the message, status, priority, owner,
next-action date and internal notes; and review immutable submission context.
Assigning a lead sends the new assignee a bounded internal email and records
the delivery result in `Admin Audit`. Status changes never email the visitor.

## Verification

Run the repository-side checks first:

```powershell
node tests\admin-portal.test.js
git diff --check
```

Then test the deployed app with each role:

1. An unknown email receives the same generic response but no email.
2. An allowed email receives one link; a second redemption fails.
3. An expired link fails and does not create a session.
4. A valid session can list/filter leads and view GA4 reports.
5. An edit increments `Revision`, updates `Last updated by`, and creates
   before/after `Admin Audit` rows.
6. Two users editing the same revision cause the later stale save to fail.
7. Reassignment sends one internal notification and records its result.
8. Sign-out revokes the session. Removing or deactivating a user blocks their
   existing sessions at the next request.
9. No lead content, contact detail or reference appears in GA4.

## Operational limits

Apps Script, Sheets, Mail and the GA4 Data API have quotas. This implementation
limits magic-link requests and caps scans to the most recent 5,000 leads. If the
workbook approaches that scale or concurrent use becomes frequent, move the
operational database and authentication to a dedicated application backend
instead of increasing Apps Script complexity.
