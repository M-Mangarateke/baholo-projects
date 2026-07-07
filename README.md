# Baholo Projects website

Presentation-ready one-page website for Baholo Projects. The site is static, deploys directly to GitHub Pages, and can later be hosted on Netlify without a framework migration.

## Preview locally

Run any static server from this directory, for example:

```powershell
npx --yes serve . -l 4173
```

Then open `http://127.0.0.1:4173`.

## Production handover notes

- Replace the code-native hero media treatment with approved Baholo project photographs or video when available.
- Insert the real GA4 measurement ID in `script.js` only after analytics ownership and consent requirements are confirmed.
- Connect the enquiry form to the approved server-side Google Sheets and email automation. Do not expose Google credentials in browser code.
- Keep WhatsApp as click tracking only unless a future API integration is approved.
- Confirm the final privacy notice, retention period and data controller details before enabling live submissions.
- Update the canonical URL only if the final production domain changes from `www.baholoprojects.co.za`.
