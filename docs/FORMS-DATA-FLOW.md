# Forms, Sheets and notifications

## Production flow

```text
Website form
  → browser validation and consent checkbox
  → hidden-iframe POST to Apps Script
  → server validation / honeypot / form-age / rate limit
  → 15-minute duplicate check
  → private Leads row + System Log event
  → administrator email + visitor acknowledgement
  → origin-restricted postMessage to website
  → success/error status + consented GA4 event
```

`generate_lead` is emitted only after Apps Script confirms a newly stored row.
A recent identical submission returns the original reference and emits the
non-key `lead_duplicate_suppressed` diagnostic event instead. Personal
information and the lead ID are never sent to Analytics.

## Workbook schema

`setup()` creates a private `Baholo Projects Website Leads` workbook with:

- `Leads`: received time, reference ID, status, visitor fields, service,
  message, consent/content versions, attribution fields, duplicate hash, email
  status and internal notes;
- `System Log`: timestamp, severity, event, reference and bounded diagnostic
  detail.

The duplicate hash is one-way and used only to suppress identical submissions
inside the configured window. It is not an authentication credential.

## Reliability and abuse controls

- required-field, length, email, phone, service-list and consent validation on
  both client and server;
- formula-injection neutralisation before user-controlled values enter Sheet
  cells;
- hidden honeypot;
- minimum form age, expiring random submission token and six-hour token replay
  suppression;
- four submissions per normalised email address per hour;
- 30 accepted submissions globally per hour as a mail-quota abuse guard;
- 15-minute duplicate suppression;
- script locking around replay/rate/duplicate/write operations, released before
  email delivery;
- HTML escaping and plain-text alternatives for email;
- Sheet-first persistence so an email failure does not lose the enquiry;
- public errors omit stack traces and internal account details;
- browser acknowledgements must come from an approved
  Apps Script/Googleusercontent origin and carry the exact random token for the
  pending submission; this accommodates Apps Script's nested HTML sandbox
  without accepting unrelated cross-frame messages;
- timeout and direct email/WhatsApp fallback on the website.

Apps Script does not reliably provide the visitor IP address. If spam becomes
material, add a server-verified bot challenge; never place its secret key in
client JavaScript.

## End-to-end release test

After deploying the Apps Script web app and adding its `/exec` URL:

1. Open the `/exec` URL directly and confirm the health JSON.
2. Submit one enquiry from the production site using an explicitly labelled
   test message and an authorised Baholo-controlled email address.
3. Confirm one row, one reference ID and a successful `Email status` value.
4. Confirm the administrator and visitor emails arrive and contain no internal
   Sheet IDs or stack traces.
5. Repeat the identical submission within 15 minutes and confirm no second row
   is created and the same reference is returned as a duplicate.
6. Confirm a successful `generate_lead` event in GA4 Realtime when analytics
   consent was granted, and no event when consent was declined.
7. Remove the labelled test row only through the approved retention/test-data
   process; do not delete operational leads casually.

## Release evidence — 30 August 2026

- The public `/exec` health response returned the expected service/version
  JSON.
- The first production attempt exposed and led to correction of a client-side
  form-age reset; the rejected attempt created no lead or email.
- The corrected labelled enquiry created exactly one `New` row with a reference
  and `Admin sent; visitor sent` email status.
- Gmail showed both the administrator notification and visitor acknowledgement
  for that reference.
- A secured token-bound acknowledgement returned the reference to the website.
- Repeating the identical enquiry inside 15 minutes returned the same reference,
  logged `duplicate_returned` and left the workbook at one lead row.
- Temporary private diagnostic functions used to verify counts/status were
  removed; the saved Apps Script editor source matches `apps-script/Code.gs`.

## Failure handling

- A stored row with a failed email status must be followed up from the Sheet.
- Review `System Log` and Apps Script Executions without copying personal data
  into tickets or GitHub issues.
- Apps Script quotas vary by account. Repeated quota errors require a delivery
  architecture review, not silent retries from the browser.
