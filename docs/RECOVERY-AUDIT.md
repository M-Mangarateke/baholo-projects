# Recovery audit

## Current state

The authoritative repository is the recovered clone at
`C:\Users\manga\Baholo Projects Website`. The old project directory on the
FAT32 `E:` volume exists only as an empty compatibility directory; it contains
no project files and is not a second working copy.

GitHub retained the complete deployable static website, its media, favicon set,
manifest, robots file, sitemap, GitHub Pages workflow and Git history. The live
deployment is produced from `main` in `M-Mangarateke/baholo-projects`.

The recovered repository originally contained only limited handover notes. The
documentation in `docs/` and the Apps Script source in `apps-script/` now form
the authoritative operational record.

## Audit findings

| Area | Finding | Current treatment |
| --- | --- | --- |
| Source parity | GitHub Pages deploys the current `main` commit | Validate the workflow SHA and public pages after every push |
| Build system | No build step or package dependencies | Static files are uploaded directly by GitHub Actions |
| Excluded files | `.gitignore` excludes a large source video and legacy world JPG derivatives | Required production media is tracked; exclusions are documented |
| Environment files | No `.env` or runtime secret file is required | Public identifiers live in `site-config.js`; private settings live in Google Script Properties |
| Secrets | No high-confidence credential patterns were found in the current tree or reachable Git history on 2026-08-30 | Continue automated/periodic secret scanning and never commit account credentials |
| Lost local logs | Development and account-operation logs were not present in Git | Deployment history, external setup state and troubleshooting procedures have been reconstructed |
| Domain | GoDaddy DNS points to GitHub Pages; email DNS was preserved | Authoritative record is `DOMAIN-DNS.md` |
| HTTPS | GitHub Pages certificate covers apex and `www`; HTTPS is enforced | Check certificate and redirects after DNS or Pages changes |
| Search | Domain property verified; three-page sitemap succeeds | Monitor indexing and the replacement of the stale GoDaddy result |
| Analytics | GA4 property and stream created; consent-gated production tag and Realtime page views verified | Revalidate after releases; `generate_lead` is the only lead key event |
| Business Profile | Accurate unverified service-business draft created | Real private operating/mailing address and Google verification remain human-controlled |
| Lead backend | Production Apps Script source reconstructed with validation, Sheet logging and emails | Owner authorisation and web-app deployment are required before setting the endpoint URL |

## Recovery rules

1. Treat the C-drive clone and GitHub `main` as authoritative.
2. Do not copy credential-looking files from the recovered drive into this
   repository. An external drive inventory identified OAuth client-secret files
   outside the project; their ownership and exposure must be reviewed privately.
3. Use the service register to reconstruct account connections. Do not store
   passwords, recovery codes, OAuth secrets or verification TXT values here.
4. After a new recovery, clone GitHub, validate DNS/HTTPS, restore only public
   configuration, then redeploy Apps Script from the reviewed source and update
   the public endpoint URL.
