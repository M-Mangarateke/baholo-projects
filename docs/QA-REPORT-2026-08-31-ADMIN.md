# Baholo Operations implementation QA — 31 August 2026

## Scope

This report covers the repository implementation, local browser verification
and live owner-account deployment of the staff portal plus the `Baholo`
short-name entity update. Staff-recipient email delivery is not claimed until
each staff member completes a live test.

## Verified repository checks

- `script.js` passed Node syntax validation.
- `tests/admin-portal.test.js` passed server/client syntax, exposed-function,
  manifest-scope, formula-neutralisation, role-seed and validation checks.
- Four homepage JSON-LD blocks parsed successfully after the entity update.
- The sitemap parsed as XML and retained exactly three canonical public URLs.
- Local `src` and `href` references in the public HTML pages resolved.
- `git diff --check` reported no whitespace errors.
- Targeted scans found no production workbook ID, personal deploying-owner
  email, private-key header or common AWS access-key pattern in the new source.

## Browser verification

A local preview adapter supplied fictional `.example.test` records and
aggregate sample metrics; no real lead data was used. Playwright CLI verified:

- desktop overview with enquiry counts, GA4 metric cards, grouped daily traffic
  bars, acquisition-share bars, top pages and meaningful events;
- enquiry table, filters, status/priority indicators and pagination states;
- detail panel, editable fields, immutable submission context and save result;
- mobile 390 × 844 layout and horizontal table affordance;
- sign-out and passwordless login states;
- public-site typography, official elephant emblem, separated sign-in action
  and branded industrial-image treatment on the staff sign-in screen;
- zero browser console errors or warnings across the tested flows.

## Security properties reviewed

- Only nine intended browser-callable functions omit the Apps Script private
  underscore suffix.
- One-time links and sessions are stored only as SHA-256 hashes.
- Every lead and Analytics method revalidates session, active user and role.
- Lead edits use an expected revision and create field-level audit rows.
- No portal delete method exists.
- GA4 scope is read-only; OAuth tokens are used only in the server-side request.
- The portal declares `noindex`, uses `no-referrer`, and loads no external
  browser scripts.

## External validation status

- Private workbook initialisation and the three-user allowlist are complete.
- A standard Google Cloud project is linked; the Google Analytics Data API is
  enabled and the owner reauthorised the required Sheets, Mail, external-request
  and read-only Analytics scopes.
- Anonymous access redirects to Google sign-in before the portal shell loads.
- Owner magic-link redemption, enquiry reads and live consented GA4 reports are
  verified.
- Version 3 is deployed on the stable web-app URL and the company-domain staff
  entry point resolves to the branded sign-in screen.
- Staff-recipient magic-link delivery, a production assignment notification and
  a live edit/audit-row check remain explicit acceptance tests; they are not
  claimed complete here.
