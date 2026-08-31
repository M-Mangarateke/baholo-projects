# Notifications and events across the system

## End-to-end operating flow

```text
Visitor website
  → client validation and privacy consent
  → public Apps Script validation, spam/rate checks and duplicate check
  → private Leads row and System Log event
  → new-enquiry email to Baholo + acknowledgement email to visitor
  → token-bound browser acknowledgement
  → consented GA4 success/diagnostic event

Baholo Operations
  → authorised staff opens/filters a lead
  → edit is validated against the latest revision
  → Leads row is updated + before/after Admin Audit rows are written
  → if assignee changed, the new assignee receives an internal email
  → aggregate GA4 reports are read into the dashboard
```

## Notification catalogue

| Notification | Recipient | Trigger | Contains | Does not contain |
| --- | --- | --- | --- | --- |
| New enquiry | Configured Baholo admin mailbox | A new row is stored | Reference, timestamp, contact, service and requirement | Sheet ID, credentials, internal notes |
| Visitor acknowledgement | Visitor | A new row is stored | Reference, timestamp and service | Internal routing, notes or account details |
| Staff magic link | Requested allowlisted user | Valid sign-in request | One-time link and expiry | Password, Sheet ID or account-enumeration result |
| Assignment notice | Newly assigned staff user | `Assigned to` changes | Reference, contact name/company, service and portal link | Visitor message, private notes or credentials |

Duplicate website submissions return the original reference without a second
row, second email pair or second `generate_lead`. Internal status/notes changes
do not email the visitor. This avoids accidental promises and notification
fatigue; customer follow-up remains a deliberate staff action outside the
portal until approved email templates and service-level rules exist.

## Event channels

There are three separate event channels because they serve different purposes:

1. **GA4 events** are consented, aggregate website measurement. They contain no
   personal data or lead reference. `generate_lead` is the only key event.
2. **System Log events** are bounded technical outcomes from the public form,
   such as stored lead, rejected spam, duplicate or server failure.
3. **Admin Audit events** are private accountability records for authentication,
   portal edits, assignment notices and Analytics access.

Admin Audit actions implemented in the first release are:

- `admin_setup_completed`
- `magic_link_sent`
- `login_succeeded`
- `logout`
- `lead_updated` (one row per changed field)
- `assignment_notification_sent` / `assignment_notification_failed`
- `analytics_viewed` / `analytics_failed`

The portal itself does not load GA4. Internal staff behaviour therefore cannot
pollute the public website's audience and conversion reports.

## Failure handling

- A lead row is written before visitor/admin email is attempted. Mail failure
  changes `Email status` and is reviewed from the portal/Sheet.
- A failed assignment email does not roll back the lead edit; it produces an
  `assignment_notification_failed` audit entry for manual follow-up.
- GA4 API failure does not block lead work. The dashboard displays a bounded
  availability message and stores a private audit event.
- Magic-link mail or quota failures return the same generic public response.
  Authorised administrators diagnose them in Apps Script Executions without
  copying personal data into GitHub issues.

## Monitoring cadence

- Daily during the first two production weeks: new leads, email status,
  unassigned leads and due follow-ups.
- Weekly: `generate_lead` trend, form errors, acquisition channels and top
  pages; compare directionally with Sheet leads.
- Monthly: Apps Script executions/quotas, failed notifications, inactive users,
  stale sessions and Admin Audit anomalies.
- Quarterly: role/access review, retention review and secret/history scan.
