# Google Analytics 4

## Production configuration

| Item | Value |
| --- | --- |
| Account | `Default Account for Firebase` |
| Property | `Baholo Projects Website` |
| Property ID | `552126734` |
| Web stream | `Baholo Projects Production Website` |
| Stream ID | `15526961959` |
| Measurement ID | `G-MKR7FTEKE8` |
| Website | `https://www.baholoprojects.co.za` |
| Time zone | South Africa, GMT+2 |
| Currency | South African rand |
| Event data retention | 14 months |
| User data retention | 14 months, reset on new activity enabled |

The GA4 property was created and linked to the verified Search Console Domain
property on 30 August 2026. The onboarding industry is Business & Industrial,
the selected business size is 1–10 employees, and the selected objectives are
lead generation and understanding website/app traffic. These are administrative
reporting settings and may be corrected later without changing website code.

Production Realtime validation on 30 August 2026 showed one active user in the
last 30 minutes, the production page title, and page-view/engagement events.
The tag was also verified to be absent before consent and loaded exactly once
after consent. The lead key event still requires the live Apps Script endpoint
and a labelled end-to-end test submission.

## Consent implementation

The website uses a basic consent model:

1. No Google Analytics script is requested before the visitor chooses
   **Allow analytics**.
2. The choice is stored under `baholo_analytics_consent_v1` in browser local
   storage and can be changed using **Cookie settings** in the footer.
3. Analytics loads only on `baholoprojects.co.za` or
   `www.baholoprojects.co.za`; localhost and preview hosts cannot send data.
4. `analytics_storage` is granted only after consent. Advertising storage,
   advertising user data and advertising personalisation remain denied.
5. Google Signals and ad-personalisation signals are disabled in the page
   configuration.
6. Event parameters must never include a person's name, email address, phone
   number, message, lead reference or WhatsApp message text.

The production measurement ID is not a credential and may be public. Google
account passwords, recovery codes, API credentials and service-account keys
must never be placed in the repository.

## Key events

`generate_lead` is registered in GA4 and marked as a key event. It is emitted
only after the lead backend returns a successful response. Do not mark form
starts or submit attempts as conversions; doing so would inflate lead counts.

GA4 also created default lead-lifecycle key-event names during onboarding. They
remain available but are not emitted by this website unless a future CRM or
qualified-lead workflow intentionally implements them.

## Production verification

After every analytics-related deployment:

1. Open the production site in a fresh browser context.
2. Before giving consent, confirm no request is made to
   `googletagmanager.com/gtag/js` and no page view appears in Realtime.
3. Choose **Allow analytics** and confirm the Google tag loads once.
4. Open GA4 Realtime and confirm a production-host page view appears.
5. Trigger one non-sensitive test interaction and confirm the expected event.
6. Submit one labelled test enquiry only after the live backend is connected;
   confirm exactly one `generate_lead` event and one Sheet row.
7. Choose **Decline analytics** using Cookie settings and confirm later website
   interactions are no longer sent.

The hostname restriction excludes ordinary local testing. Production visits by
Baholo staff still count unless an internal-traffic rule is configured. Add an
internal rule only after Baholo supplies a stable public office IP; do not guess
or use a temporary residential/mobile IP.

## Administration

- Review GA4 Realtime after material releases.
- Review event names and parameter cardinality monthly for the first quarter.
- Keep the Search Console product link active unless the property ownership
  model changes.
- Restrict Analytics access to named administrators and use role-appropriate
  permissions.
- Record account ownership and recovery procedures in the organisation's
  password manager or private service register, never in Git.
