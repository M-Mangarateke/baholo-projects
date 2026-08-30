# Deployment and rollback

## Normal release

The GitHub Pages workflow in `.github/workflows/deploy-pages.yml` deploys static
files from `main`.

1. Run local syntax, XML, structured-data, link and form checks.
2. Review `git status` and exclude local tooling or sensitive material.
3. Commit one coherent phase with an audit-friendly message.
4. Push `main` to `origin`.
5. Confirm the matching commit SHA completes successfully:

```powershell
gh run list --workflow deploy-pages.yml --limit 5
gh run view <run-id>
```

6. Validate the production domain, not only the GitHub hostname:

```powershell
Invoke-WebRequest https://www.baholoprojects.co.za/ -UseBasicParsing
Invoke-WebRequest https://www.baholoprojects.co.za/sitemap.xml -UseBasicParsing
Invoke-WebRequest https://www.baholoprojects.co.za/robots.txt -UseBasicParsing
```

7. Confirm HTTP/apex redirects, the HTTPS certificate, metadata, navigation,
   consent behavior and form status.

## Rollback

Do not rewrite history or use `git reset --hard`. Revert the faulty release with
a new commit, push it, and validate the replacement Pages run:

```powershell
git revert <faulty-commit>
git push origin main
```

Reverting website code does not roll back GoDaddy, Search Console, GA4, the
Business Profile or Apps Script. Record and reverse those account changes in
their own systems only after identifying their impact.

## Domain protection

Keep the repository Pages custom domain set to `www.baholoprojects.co.za` and
HTTPS enforcement enabled. Do not add GoDaddy forwarding. Never alter retained
MX, SPF or Google verification records as part of a website deployment.
