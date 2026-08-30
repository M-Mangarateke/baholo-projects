# Google Search Console

## Production property

| Item | Production value |
| --- | --- |
| Property type | Domain property |
| Property | `baholoprojects.co.za` |
| Canonical site | `https://www.baholoprojects.co.za/` |
| Sitemap | `https://www.baholoprojects.co.za/sitemap.xml` |
| Robots file | `https://www.baholoprojects.co.za/robots.txt` |
| Ownership status | Verified on 2026-08-30 using a DNS TXT record |
| Sitemap status | Success; 3 discovered pages on 2026-08-30 |

The Domain property is intentional: it covers HTTP and HTTPS plus the apex and
all subdomains. GitHub Pages redirects the HTTP and apex variants to the
canonical HTTPS `www` URL.

The Google account used for administration must be recorded in the
organisation's password manager or service register, not in this repository.

## DNS verification rule

GoDaddy contains more than one `google-site-verification` TXT record at the
apex. This is valid. The older record was retained because it may prove
ownership for a different Google service or owner. The Search Console record
added on 2026-08-30 must remain in DNS while this property is in use.

Do not commit verification values to the repository. Do not replace or combine
the SPF TXT record, and do not change Google Workspace MX records while working
on Search Console ownership.

## Search-result recovery

Before the production-domain launch, Google had indexed a GoDaddy/Airo holding
page for the domain. That stale result used a GoDaddy-generated title,
description and default icon. It does not describe the current live website.

The production homepage now provides these consistent signals:

- a Baholo Projects page title and description;
- `https://www.baholoprojects.co.za/` as its canonical URL;
- stable, crawlable Baholo favicon URLs;
- `Organization`, `ProfessionalService`, `WebSite` and visible `FAQPage`
  structured data;
- matching Open Graph and Twitter metadata on the production hostname;
- a public sitemap and permissive robots file.

Google decides the final title, snippet and favicon. A successful sitemap
submission or indexing request is not a guarantee of indexing or of an
immediate visual update. Recrawling and reprocessing can take days or weeks.

## Submission and inspection procedure

1. Open the `baholoprojects.co.za` Domain property.
2. Open **Indexing > Sitemaps** and submit the full production sitemap URL.
3. Confirm that the sitemap status is **Success** and that the expected URL
   count is discovered.
4. Use **URL inspection** for `https://www.baholoprojects.co.za/`.
5. Run **Test live URL** before requesting indexing.
6. Confirm that the live page is reachable, indexable, uses HTTPS, and declares
   the production `www` URL as canonical.
7. Request indexing only for public pages that should appear in search. Do not
   request indexing for redirect URLs, duplicate variants, or internal pages.
8. Inspect `https://www.baholoprojects.co.za/privacy.html` and
   `https://www.baholoprojects.co.za/terms.html` after the homepage.

## Launch record

On 30 August 2026, the production sitemap was submitted successfully. The
homepage and privacy notice passed Google's live URL test and indexing requests
were queued for the canonical homepage, the legacy apex URL and the privacy
notice. The apex request is a migration signal only: it redirects to the
canonical `www` homepage and should not remain a separately indexed result.

At the time of launch, Google's stored apex result still represented the former
GoDaddy/Airo page crawled on 27 August 2026. The live test subsequently saw the
Baholo site and its `www` canonical. This record explains why a stale GoDaddy
title, description or icon may remain temporarily even though DNS and the live
page are correct.

After the terms page was deployed, the updated sitemap was resubmitted and
Search Console reported **Success** with three discovered pages. The terms page
passed the live URL test and its indexing request was added to Google's priority
crawl queue. This is not a claim that Google has indexed or will rank the page.

Later on 30 August, a live Google search showed the terms page using its correct
Baholo title while the apex homepage result still showed the old GoDaddy/Airo
content. That mixed state confirms processing is occurring URL by URL; it does
not justify repeated indexing requests or temporary-removal tools.

A subsequent live search on 30 August showed the homepage with the corrected
Baholo title and industrial-services description; the GoDaddy/Airo title and
free-credit snippet were absent. Continue normal monitoring because Google may
still recalculate snippets, favicons, canonical selection and rankings over
time. At that observation Google still rendered its generic fallback icon.
The source now prioritises stable 48×48 and 192×192 Baholo PNG icons—both valid
multiples of 48—before smaller/browser fallbacks. Favicon display remains a
separate Google recrawl/reprocessing observation, not a reason to submit
repeated indexing requests.

## Monitoring checklist

For the first four weeks after launch, check Search Console weekly:

- Page indexing: indexed pages, redirects, 404s, soft 404s, duplicates and
  canonical selection.
- Sitemaps: read date, status and discovered-page count.
- Performance: brand and service queries, clicks, impressions, click-through
  rate and canonical landing pages.
- Core Web Vitals: mobile and desktop issues once field data is available.
- Enhancements: structured-data errors or warnings.
- Security and manual actions: review immediately if either report changes.

After the launch period, review monthly and after every material deployment.
Search Console data can take several days to begin appearing for a newly
verified property.

## Troubleshooting

- **Ownership is lost:** confirm the verification TXT record still exists in
  public DNS. Do not delete another owner's record while investigating.
- **Sitemap cannot be fetched:** verify the URL returns HTTP 200, contains valid
  XML, is not blocked by `robots.txt`, and lists only canonical public URLs.
- **Old GoDaddy result remains:** inspect the canonical homepage, test the live
  URL, request a recrawl once, and wait for Google to reprocess it. Repeated
  requests do not accelerate the process.
- **Apex URL appears in results:** confirm the apex redirects to the HTTPS `www`
  URL and that page metadata, sitemap URLs and internal links use the canonical
  hostname.
- **Wrong favicon remains:** confirm the homepage and favicon are crawlable and
  the favicon is a stable square image. Google may still need time to recrawl it.
