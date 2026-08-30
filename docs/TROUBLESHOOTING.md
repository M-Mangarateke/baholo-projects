# Troubleshooting

## Old GoDaddy title, description or icon in Google

Confirm the live canonical page and favicon return 200, inspect the canonical
URL in Search Console and wait for recrawl/reprocessing. Do not repeatedly
request indexing or change DNS when the live test is correct.

## Browser says the site is not secure

Check public DNS first, then the GitHub Pages API and certificate. Confirm all
variants redirect to the HTTPS `www` URL. Do not add GoDaddy forwarding or
replace email DNS records. Follow `DOMAIN-DNS.md`.

## Form says the lead system is not connected

`LEAD_ENDPOINT_URL` is blank or the current deployment did not include it.
Confirm the Apps Script `/exec` health response, then set the exact URL in
`site-config.js` and deploy. Never use the `/dev` test URL in production.

## Form times out or returns an error

Check Apps Script Executions and `System Log`. Confirm the current deployment
still executes as the owner and allows anonymous public access. Check Sheets and
Mail quotas, Script Properties and the destination workbook. The visitor can
use the published email or WhatsApp fallback while recovery proceeds.

## Row exists but email is missing

Treat the Sheet as the source of truth. Inspect the row's Email status and the
execution log, then follow up manually from an authorised account. Do not ask
the visitor to resubmit repeatedly.

## Analytics is missing

Analytics intentionally remains off until consent and does not load on local or
preview hosts. Test on the canonical production domain, allow analytics, confirm
one Google tag, then check GA4 Realtime. Never send PII in a diagnostic event.

## Business Profile is not public

The draft requires Google verification. Enter the real private operating/mailing
address and complete Google's offered method. Do not publish a residential or
registration address merely to remove the warning, and do not create a second
profile.

## Pages deployment fails

Open the matching GitHub Actions run, fix the first failing workflow step and
push a new commit. Preserve the custom domain. If a release itself is faulty,
use `git revert` and validate the replacement run.
