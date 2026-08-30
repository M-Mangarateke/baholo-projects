# Baholo Projects website

Presentation-ready one-page website for Baholo Projects. The site is static, deploys directly to GitHub Pages, and can later be hosted on Netlify without a framework migration.

## Preview locally

Run any static server from this directory, for example:

```powershell
npx --yes serve . -l 4173
```

Then open `http://127.0.0.1:4173`.

## Production handover notes

- The recovered architecture and gap audit are documented in
  [`docs/RECOVERY-AUDIT.md`](docs/RECOVERY-AUDIT.md).
- Architecture and development setup are documented in
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Releases and rollback are documented in
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
- The production-domain DNS, redirect strategy, retained email records, and
  verification procedure are documented in [`docs/DOMAIN-DNS.md`](docs/DOMAIN-DNS.md).
- Search Console ownership, sitemap handling, stale GoDaddy result recovery and
  the post-launch monitoring process are documented in
  [`docs/SEARCH-CONSOLE.md`](docs/SEARCH-CONSOLE.md).
- The GA4 property, consent implementation and verification procedure are
  documented in [`docs/GOOGLE-ANALYTICS.md`](docs/GOOGLE-ANALYTICS.md).
- The intentional measurement events and key-event rules are documented in
  [`docs/EVENT-TRACKING.md`](docs/EVENT-TRACKING.md).
- The Google Business Profile draft and verification boundary are documented in
  [`docs/GOOGLE-BUSINESS-PROFILE.md`](docs/GOOGLE-BUSINESS-PROFILE.md).
- Form processing, the private Sheet and notification workflow are documented
  in [`docs/FORMS-DATA-FLOW.md`](docs/FORMS-DATA-FLOW.md).
- Public configuration is documented in
  [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md); security decisions in
  [`docs/SECURITY.md`](docs/SECURITY.md).
- Ongoing checks and recovery steps are in
  [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) and
  [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).
- The evidence-backed release status and remaining external validation gates
  are in [`docs/QA-REPORT-2026-08-30.md`](docs/QA-REPORT-2026-08-30.md).
- The authoritative service register is
  [`docs/EXTERNAL-SERVICES.md`](docs/EXTERNAL-SERVICES.md).

- All generated photographic assets used by the site are stored as WebP files in `assets/images/`.
- The looping Inside Baholo strip uses the ordered WebP sequence in `assets/images/world/`.
- `assets/videos/hero-welder.webm` is the silent primary hero video, with `hero-welder-silent.mp4` as the silent Safari fallback and `assets/images/hero-welder.webp` as the poster. The production-ready Google Flow/Omni brief is in `creative/Google-Flow-Hero-Video-Prompt.md`.
- Replace generated media with approved Baholo project photography only when suitable original material becomes available.
- Do not create additional AI-generated media for this release. New pipework cards use supplied Baholo industrial photography with factual, non-project-specific descriptions.
- The production GA4 measurement ID is public configuration, not a secret. It
  is stored in `site-config.js`; do not place Google account credentials or API
  secrets there.
- The Apps Script backend source is in `apps-script/`. Keep
  `LEAD_ENDPOINT_URL` blank until the owner has authorised, deployed and tested
  the production web app.
- The Apps Script project and private Sheet should be owned by the Baholo
  administration account. Record access and recovery contacts privately.
- Do not expose Google credentials or the Google Sheet itself in browser code.
- Keep WhatsApp as click tracking only unless a future API integration is approved.
- The public privacy notice is `privacy.html` and the website terms are
  `terms.html`. The stated enquiry retention period is up to 24 months from the
  last meaningful interaction, subject to qualified South African legal and
  POPIA review.
- Update the canonical URL only if the final production domain changes from `www.baholoprojects.co.za`.
- The requested news section is deferred until Baholo assigns an editorial owner and approves a sourcing, attribution and storage workflow.
- Baholo has approved the statement that the company has worked with Heineken. The website uses `assets/heineken-logo-transparent.png`, which preserves the red star and white lettering while removing the supplied green panel and outer canvas.
