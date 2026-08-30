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

## Workflow maintenance

The workflow uses the current Node 24 action majors verified from the official
repositories on 30 August 2026: `checkout@v7`, `configure-pages@v6`,
`upload-pages-artifact@v5` and `deploy-pages@v5`. This removed the runner's
Node 20 deprecation annotation.

`deploy-pages@v5` currently emits a successful-run `DEP0040` warning from its
bundled `punycode` dependency. The official upstream issue is
`actions/deploy-pages#434`; it has no clean consumer-side fix. Do not suppress
Node warnings or pin an unreleased action to hide it. Recheck the official
release before changing the major version.

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
