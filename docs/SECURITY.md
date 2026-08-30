# Security and production readiness

## Audit result

On 30 August 2026, high-confidence patterns for private keys, common cloud keys
and GitHub tokens were not found in the current repository or its reachable Git
history. No tracked `.env`, client-secret, credential or private-key filename
was found. This is evidence from the performed scan, not a permanent guarantee.

The recovered external drive contains credential-looking OAuth client files
outside this repository. Do not import them. Privately determine which projects
they belong to and rotate/revoke only where actual exposure or loss of control
is confirmed.

## Controls in place

- HTTPS-only production with a valid GitHub Pages certificate;
- canonical `www` host and server redirects for HTTP/apex variants;
- no client-side secret or direct Sheet access;
- consent-gated, production-host-only GA4;
- no analytics PII parameters;
- Apps Script server validation, duplicate detection, rate limiting, locking,
  email-header normalisation, formula-injection neutralisation, bounded logs
  and escaped email templates;
- private Sheet ownership and origin-restricted acknowledgement;
- form acknowledgements accepted only from approved
  Apps Script/Googleusercontent origins when they also carry the exact random
  token for the pending submission;
- external links use `rel="noopener"` where a new tab is opened;
- a strict-origin-when-cross-origin referrer policy on every public page;
- reduced-motion and constrained-network media handling;
- dependency-free website, eliminating package-runtime vulnerability exposure.

## Known platform boundaries

GitHub Pages does not provide repository-controlled response headers such as a
full Content Security Policy, Permissions Policy or HSTS policy. A meta CSP was
not added because the page contains maintained inline JSON-LD blocks and a
consent-loaded Google tag; an incomplete policy could silently break search
data or measurement. If strict security headers become a requirement, move the
static site behind a host/CDN that supports reviewed response headers.

The Apps Script `/exec` URL is public by design. Security comes from strict
validation, abuse controls and owner-only data access—not from treating the URL
as a password.

## Account and permission rules

- Use named administrators, MFA and recovery methods stored outside Git.
- Apps Script executes as the deploying owner; public visitors must never be
  asked to authorise Google access.
- Keep the Sheet private. Share only with named operational users at the lowest
  suitable role.
- Keep GitHub, GoDaddy, Search Console, Analytics and Business Profile access
  limited to accountable owners.
- Never paste personal enquiry data into GitHub issues, logs committed to Git,
  analytics parameters or public support posts.

## Review cadence

Run the repository/history secret scan, account-access review and Apps Script
permission review quarterly and after any suspected credential loss. Review
form abuse, mail failures and Google execution quotas monthly for the first
quarter after launch.
