# Baholo Operations implementation QA — 31 August 2026

## Scope

This report covers the repository implementation and local browser verification
of the staff portal plus the `Baholo` short-name entity update. It does not
claim that the portal's external Google deployment or three-user magic-link
delivery has been completed.

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

- desktop overview with enquiry counts, GA4 metric cards, traffic chart,
  channels, top pages and meaningful events;
- enquiry table, filters, status/priority indicators and pagination states;
- detail panel, editable fields, immutable submission context and save result;
- mobile 390 × 844 layout and horizontal table affordance;
- sign-out and passwordless login states;
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

## External validation gate

The Apps Script project has been created in the signed-in owner account. The
reviewed source and signed-in-only manifest have been entered, the accidental
blank HTML file has been removed, and the private workbook, GA4 property and
three-user allowlist have been stored as Script Properties. Production
completion still needs:

1. completion of the owner-reviewed Google authorization warning, followed by
   private workbook initialisation;
2. Google Analytics Data API availability for the project;
3. a versioned web-app deployment executing as the owner and requiring Google
   sign-in before the hidden login page can load;
4. live tests for unknown-user behaviour, one-time redemption, lead read/edit,
   audit rows, assignment email, GA4 reports and sign-out.

These are not marked complete until the live evidence exists.
