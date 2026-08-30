# Production domain and DNS

This document is the authoritative handover record for the Baholo Projects
production domain. It intentionally contains no GoDaddy or GitHub credentials.

## Production configuration

- Production domain: `baholoprojects.co.za`
- Canonical site: `https://www.baholoprojects.co.za/`
- Registrar and DNS host: GoDaddy
- Authoritative nameservers: `ns49.domaincontrol.com` and
  `ns50.domaincontrol.com`
- Hosting: GitHub Pages
- Repository: `M-Mangarateke/baholo-projects`
- GitHub Pages custom domain: `www.baholoprojects.co.za`
- Deployment source: the repository's GitHub Pages workflow

GitHub Pages is responsible for redirecting the apex domain to `www`. Do not
configure GoDaddy domain forwarding in addition to this redirect.

## Website DNS records

The following records were configured on 30 August 2026. TTLs were kept at one
hour for the cutover.

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `m-mangarateke.github.io` |

The `www` CNAME target must not include a protocol, path, or the repository
name.

## Records that must be retained

The website cutover did not change the following records:

- GoDaddy NS and SOA records.
- The `_domainconnect` CNAME.
- All five Google Workspace MX records: `aspmx.l.google.com`, `alt1`, `alt2`,
  `alt3`, and `alt4` with their existing priorities.
- The apex SPF TXT record and its delegated `_spfm` TXT record.
- The existing Google site-verification TXT record.

Do not delete or replace these records during website maintenance. The MX and
SPF records are part of Baholo Projects email delivery and are independent of
the website host.

## Cutover and verification record

On 30 August 2026:

1. GitHub Pages was configured with `www.baholoprojects.co.za` before changing
   DNS, preventing another Pages site from claiming the hostname.
2. The GoDaddy Website Builder apex record was changed to GitHub's first Pages
   address; the remaining A and AAAA records were then added.
3. `www` was changed from the apex domain to `m-mangarateke.github.io`.
4. GoDaddy displayed successful-save confirmations for all website records.
5. The GoDaddy authoritative nameserver, Cloudflare DNS (`1.1.1.1`), and Google
   Public DNS (`8.8.8.8`) returned all four A records, all four AAAA records,
   and the correct `www` CNAME.
6. The custom domain returned the Baholo Projects GitHub Pages site over HTTP,
   with the apex redirecting to `www`.

GitHub certificate issuance begins only after the custom domain and DNS are
valid. Until issuance completes, `https_enforced` can remain false and HTTPS
may show a certificate-name error. Enable HTTPS enforcement as soon as GitHub
reports that the certificate exists.

## GitHub Pages checks

View the current Pages state:

```powershell
gh api repos/M-Mangarateke/baholo-projects/pages
```

After the certificate exists, enforce HTTPS while preserving the custom
domain:

```powershell
gh api --method PUT repos/M-Mangarateke/baholo-projects/pages `
  -f cname=www.baholoprojects.co.za `
  -F https_enforced=true
```

Confirm that the response contains:

- `cname: www.baholoprojects.co.za`
- `https_enforced: true`
- `html_url: https://www.baholoprojects.co.za/`

## DNS verification

Check the public website records against two independent resolvers:

```powershell
Resolve-DnsName baholoprojects.co.za -Type A -Server 1.1.1.1
Resolve-DnsName baholoprojects.co.za -Type AAAA -Server 1.1.1.1
Resolve-DnsName www.baholoprojects.co.za -Type CNAME -Server 1.1.1.1
Resolve-DnsName baholoprojects.co.za -Type A -Server 8.8.8.8
Resolve-DnsName baholoprojects.co.za -Type AAAA -Server 8.8.8.8
Resolve-DnsName www.baholoprojects.co.za -Type CNAME -Server 8.8.8.8
```

After HTTPS is enforced, verify these outcomes:

- `http://baholoprojects.co.za/` redirects to
  `https://www.baholoprojects.co.za/`.
- `http://www.baholoprojects.co.za/` redirects to HTTPS.
- `https://baholoprojects.co.za/` redirects to the canonical `www` URL.
- `https://www.baholoprojects.co.za/` returns HTTP 200 with a valid certificate.

## Troubleshooting

- If the old GoDaddy placeholder appears, check the resolver being used and
  clear only the local DNS/browser cache; do not alter the authoritative DNS
  records when public resolvers already return the GitHub addresses.
- If HTTPS is unavailable immediately after a DNS change, wait for GitHub's
  certificate issuance and check the Pages API before changing DNS again.
- If email delivery fails, stop website changes and verify that all MX and SPF
  records still match the retained-record list above.
- Do not add a second redirect or forwarding service. Multiple redirect layers
  can cause loops and interfere with certificate issuance.
