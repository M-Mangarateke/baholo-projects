# Baholo Projects website

Presentation-ready one-page website for Baholo Projects. The site is static, deploys directly to GitHub Pages, and can later be hosted on Netlify without a framework migration.

## Preview locally

Run any static server from this directory, for example:

```powershell
npx --yes serve . -l 4173
```

Then open `http://127.0.0.1:4173`.

## Production handover notes

- The production-domain DNS, redirect strategy, retained email records, and
  verification procedure are documented in [`docs/DOMAIN-DNS.md`](docs/DOMAIN-DNS.md).
- Search Console ownership, sitemap handling, stale GoDaddy result recovery and
  the post-launch monitoring process are documented in
  [`docs/SEARCH-CONSOLE.md`](docs/SEARCH-CONSOLE.md).

- All generated photographic assets used by the site are stored as WebP files in `assets/images/`.
- The looping Inside Baholo strip uses the ordered WebP sequence in `assets/images/world/`.
- `assets/videos/hero-welder.webm` is the silent primary hero video, with `hero-welder-silent.mp4` as the silent Safari fallback and `assets/images/hero-welder.webp` as the poster. The production-ready Google Flow/Omni brief is in `creative/Google-Flow-Hero-Video-Prompt.md`.
- Replace generated media with approved Baholo project photography only when suitable original material becomes available.
- Do not create additional AI-generated media for this release. New pipework cards use supplied Baholo industrial photography with factual, non-project-specific descriptions.
- Insert the real GA4 measurement ID in `site-config.js` only after analytics ownership and consent requirements are confirmed.
- Google Apps Script and Google Sheets deployment is deferred until access to the Baholo administration account is available. Keep `LEAD_ENDPOINT_URL` blank until that work resumes.
- When the lead system resumes, the Baholo administration account should own the Apps Script and private Sheet. The intended editor and notification mapping must be re-confirmed before deployment.
- Do not expose Google credentials or the Google Sheet itself in browser code.
- Keep WhatsApp as click tracking only unless a future API integration is approved.
- The public privacy notice is `privacy.html`. Retention is set to 24 months unless Baholo confirms a different operational/legal requirement.
- Update the canonical URL only if the final production domain changes from `www.baholoprojects.co.za`.
- The requested news section is deferred until Baholo assigns an editorial owner and approves a sourcing, attribution and storage workflow.
- Baholo has approved the statement that the company has worked with Heineken. The website uses `assets/heineken-logo-transparent.png`, which preserves the red star and white lettering while removing the supplied green panel and outer canvas.
