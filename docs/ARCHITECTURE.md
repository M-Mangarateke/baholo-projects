# Architecture and local development

## System overview

Baholo Projects is a dependency-free static website:

```text
Visitor browser
  ├─ GitHub Pages: HTML, CSS, JavaScript, media, sitemap and robots
  ├─ GA4: loaded only after analytics consent on the production hostname
  └─ Quote form: HTML POST to Google Apps Script in a hidden iframe
       ├─ server validation, spam controls and duplicate detection
       ├─ private Google Sheet lead register and system log
       ├─ administrator notification email
       ├─ visitor acknowledgement email
       └─ postMessage result to the canonical website origin

Authorised staff browser
  └─ Separate Baholo Operations Apps Script web app
       ├─ one-time magic-link authentication and private role allowlist
       ├─ filtered/editable lead workflow with revision checks
       ├─ field-level Admin Audit and assignment notifications
       └─ read-only GA4 Data API dashboard
```

GoDaddy is the DNS authority. GitHub Pages provides hosting, redirects and TLS.
Search Console, GA4 and the Business Profile are administrative Google services;
they do not provide website hosting.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html` | Homepage, visible service/entity content, quote form and structured data |
| `privacy.html` | Public privacy and tracking notice |
| `terms.html` | Website terms of use |
| `styles.css` | All responsive presentation and accessibility states |
| `script.js` | Navigation, progressive media, consent, analytics events and form client logic |
| `site-config.js` | Public integration identifiers and content-version values |
| `apps-script/` | Reviewed source and manifest for the private lead web app |
| `apps-script-admin/` | Separate staff portal, magic-link auth, lead operations and GA4 reporting |
| `assets/` | Logos, icons, social card, images and hero video |
| `.github/workflows/` | GitHub Pages deployment workflow |
| `docs/` | Operational and recovery handover |

## Local setup

No package installation or compilation is required. From the repository root:

```powershell
npx --yes serve . -l 4173
```

Open `http://127.0.0.1:4173`. Analytics is hostname-restricted and will not send
local activity. The production lead endpoint may still accept a local POST, but
its acknowledgement targets the production origin; use the production site for
the final end-to-end test.

Before committing:

```powershell
node --check script.js
Get-Content -LiteralPath apps-script\Code.gs -Raw | node --check -
node tests\admin-portal.test.js
git diff --check
```

Validate all JSON-LD blocks, sitemap XML, local asset references and the form in
a browser. Generated `.playwright-cli/` state is local tooling output and must
not be committed.

## Progressive media

The hero poster is preloaded as the LCP candidate. The hero video sources are
attached only on desktop-sized connections that do not request reduced motion,
Data Saver or a 2G connection. Mobile and constrained visitors receive the
poster instead of a multi-megabyte autoplay download. The world strip defers
its image sequence until it approaches the viewport.
