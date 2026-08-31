# Baholo Operations portal

## Purpose

Baholo Operations is the staff-facing layer above the private website lead
register. It gives the Administrative Officer, Operations Manager and owner a
usable workflow without sharing the underlying Sheet broadly or requiring them
to work directly in rows and columns.

```text
Authorised staff browser
  → pass Google sign-in gate and request one-time email link
  → Apps Script verifies private allowlist and sends 15-minute token
  → token is redeemed once for an eight-hour tab session
  → every server request rechecks session, active user and role
  ├─ private Leads read/filter/edit
  ├─ private Admin Audit write
  ├─ internal assignment email
  └─ read-only GA4 Data API reports
```

The private staff entry point is `https://www.baholoprojects.co.za/baholooperations/`.
It is not linked from the public website, sitemap, Search Console or Business
Profile, and both the entry point and portal are `noindex`. A signed-in Google
account is required before the portal loads; only a privately allowlisted
account can receive and redeem a magic link. The portal is a second Apps Script project. Keeping it separate prevents
changes to authentication, Analytics scopes or staff UI from destabilising the
already verified public lead endpoint.

## User experience

- passwordless sign-in with a generic response that does not reveal whether an
  account exists;
- a permanent, bookmarkable company-domain entry point from which staff can
  request their own 15-minute sign-in link whenever needed;
- overview counts for new, active, due and won enquiries;
- searchable, paginated enquiry table with status, service, assignee and
  priority filters;
- detail view for contact corrections, operational status, assignment,
  next-action date and internal notes;
- stale-edit protection so one user cannot silently overwrite another user's
  newer save;
- GA4 cards, daily trend, acquisition channels, top pages and meaningful event
  results;
- responsive layout suitable for office desktops and mobile follow-up.

## Data ownership and roles

The runtime allowlist is the private `Admin Users` sheet. Initial users are
seeded from a private Script Property; production email addresses are not kept
in Git. All three approved roles can view, filter and edit leads and view
aggregate Analytics. The owner remains responsible for user activation,
service ownership and recovery.

No role can delete a lead from the portal. Original receipt, consent, form
version, attribution and email-delivery fields are not editable. Permitted
corrections still produce field-level before/after audit records.

## Analytics interpretation

GA4 is an aggregate measurement layer, not the enquiry database. Because the
public site loads GA4 only after consent, portal totals will legitimately be
lower than raw website traffic and Sheet lead counts. The portal shows only
events that answer a business or quality question and never requests or sends
lead names, email addresses, phone numbers, messages or reference IDs to GA4.

`generate_lead` is the key event and should reconcile directionally—not always
numerically—with newly stored Sheet rows because consent, blockers and duplicate
suppression differ. The private Sheet remains the operational source of truth.

## Deployment boundary

Repository implementation is complete in `apps-script-admin/`. Creating the
Apps Script project, enabling the GA4 Data API, authorising scopes, setting
private properties and creating the unlisted, signed-in-only web-app deployment
are external account changes. They must be performed in the approved owner
account and then validated with all three authorised users. Exact steps and
checks are in
[`apps-script-admin/README.md`](../apps-script-admin/README.md).
