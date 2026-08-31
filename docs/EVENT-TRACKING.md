# Event tracking specification

## Principles

Measurement is limited to interactions that answer a business or quality
question. Events are sent only after analytics consent and only from the
production domain. Parameters contain non-sensitive labels; enquiry content and
personal information are never sent to Analytics.

## Event taxonomy

| Event | Trigger | Important parameters | Key event |
| --- | --- | --- | --- |
| `generate_lead` | Backend confirms a newly stored enquiry | `form_name` | Yes |
| `lead_duplicate_suppressed` | Backend returns the existing reference for a recent identical enquiry | `form_name` | No |
| `lead_form_start` | First input in the quote form | `form_name` | No |
| `lead_form_submit_attempt` | Valid form is handed to the backend | `form_name` | No |
| `lead_form_error` | Client validation, missing endpoint, backend error or timeout | `form_name`, `error_reason` or `error_count` | No |
| `cta_click` | A marked quote/contact call to action is selected | `link_text`, optional `cta_location` | No |
| `contact_click` | A marked email, phone or WhatsApp link is selected | `link_text`, `contact_method` | No |
| `service_select` | A service panel is selected | `service_name` | No |
| `pipe_story_open` | A pipework detail dialog is opened | `story_name` | No |
| `developer_portfolio_click` | Footer developer link is selected | `link_text`, `link_domain`, `link_path` | No |

For HTTP(S) links, tracking records only the destination hostname and path. It
does not retain query parameters. This prevents the prefilled WhatsApp message
or other URL parameters from entering Analytics.

## Funnel interpretation

Use this sequence for the enquiry funnel:

`lead_form_start` → `lead_form_submit_attempt` → `generate_lead`

Use `lead_form_error` and `lead_duplicate_suppressed` as diagnostic events, not
funnel successes. A new lead is counted at the backend acknowledgement boundary
rather than on a button click. The Sheet/reference ID is the operational source
of truth; GA4 is the aggregate marketing measurement layer.

Baholo Operations does not load GA4. Staff authentication, reads and edits are
recorded only in the private `Admin Audit` channel so internal activity cannot
inflate public traffic or conversion reporting. See
[`NOTIFICATIONS-EVENTS.md`](NOTIFICATIONS-EVENTS.md).

## Change control

- Use lowercase snake_case event names.
- Reuse the event names above instead of creating page-specific variations.
- Add a new event only when it supports a defined decision, alert or funnel.
- Do not pass high-cardinality identifiers, timestamps, free text or personal
  information as event parameters.
- Document any change here and validate it in GA4 Realtime before marking it
  complete.
