# 4. UI/UX Preparation, Delivery Plan, and Acceptance Criteria

## 4.1 UI/UX objective

The next phase should make a household move understandable: what information to provide, what each vendor includes, what the customer will pay, who will arrive, what happens next, and how to resolve a problem.

Build designs around the workflows and permissions already documented. Do not start with isolated attractive dashboard screens that cannot complete a booking.

## 4.2 Screen inventory

### Customer mobile app

1. Welcome, language selection, phone login, OTP, and profile setup.
2. Home: create a move, active booking card, and past moves.
3. Request wizard: locations → date/home/access details → inventory/photos → services → review/submit.
4. Matching progress, no vendors available, and request edit/close.
5. Quote list, comparison, vendor profile/reviews, and full quote detail.
6. Quote acceptance summary, cancellation terms, payment checkout, pending/success/failure.
7. Booking detail: scope, timeline, schedule, vendor/team and support action.
8. Change-order review and schedule-change review.
9. Cancellation preview, cancellation outcome, and refund tracking.
10. Delivery confirmation, issue reporting, completion and review.
11. Booking history, charges/receipts, notification inbox, saved addresses, support tickets and settings.

Suggested navigation: Home, My Moves, Notifications, Profile. Place support contextually within each booking and in Profile.

### Vendor web portal

1. Login, application wizard, document upload, review status and corrections.
2. Dashboard with upcoming jobs, pending leads, assignment alerts and financial summary.
3. Leads list/detail, clarification/survey request, quote builder and quote history.
4. Bookings list/calendar and booking detail.
5. Worker invitations, worker list and membership status.
6. Vehicles and availability.
7. Team/vehicle assignment and acceptance status.
8. Job timeline, incident reporting and change-order creation.
9. Transactions, commission and settlement statements.
10. Business profile, services, service areas, notification settings and support.

### Worker mobile area

1. Login, invitation acceptance and membership status.
2. Today's jobs and upcoming jobs.
3. Assignment detail and accept/reject.
4. Active job with one primary next-step action.
5. Item/service checklist, photo capture and upload status.
6. Issue reporting and contact options.
7. Delivery confirmation flow, completed job summary and own work history.

Worker screens should support one-handed use, large touch targets, clear local-language status labels, and obvious offline/pending indicators.

### Admin web portal

1. Secure login and operational overview.
2. Vendor approval queue, document review and decision history.
3. Customers, vendors, workers and account restrictions.
4. Bookings, timeline, exception queue and audited action dialogs.
5. Tickets/disputes, evidence and resolution.
6. Payment reconciliation, refunds and settlement operations.
7. Service areas, catalog, policy versions and commercial configuration.
8. Reports, review moderation, admin permissions and audit log.

### Public website

Home, how it works, covered areas, service descriptions, vendor application entry, contact/support, and approved policy pages. Do not display unsupported coverage, fabricated vendor counts, or placeholder reviews as real claims.

## 4.3 Required UI states

For every relevant screen, specify loading, empty, validation error, permission denied, retry, and success behavior. Critical additional states include:

| Screen | States that must be designed |
|---|---|
| OTP | Expired code, rate limit, wrong code, lost access/recovery |
| Request | Unsupported area, invalid date, incomplete draft, failed photo upload |
| Quotes | No quotes, expired quote, revised request, vendor suspended, reservation already taken |
| Checkout | Pending verification, failed payment, app closed, duplicate tap, late success under review |
| Assignment | No available team, worker rejected, vehicle conflict, reassignment |
| Job | Delay, offline draft, rejected stale update, incident, customer unreachable |
| Completion | Incorrect/expired code, missing proof, disputed delivery, admin fallback pending |
| Finance | Partial refund, failed refund, held settlement, unpaid balance |

The primary action label must describe the actual commitment: “Submit request,” “Accept quote,” or “Pay advance,” rather than reusing “Confirm” everywhere.

## 4.4 UI/UX deliverables and order

1. Validate launch assumptions, personas, payment model, and cancellation rules.
2. Create sitemap and four-role user journey maps.
3. Wireframe the customer request-to-completion path and vendor quote-to-assignment path together.
4. Wireframe worker execution and admin exception handling.
5. Review content fields, empty/error states, and Tamil/English text expansion.
6. Establish typography, color, spacing, accessible controls, forms, cards and timeline components.
7. Produce high-fidelity screens and a clickable cross-role booking prototype.
8. Test with representative customers, local vendors, and workers; record friction and revise.
9. Hand off annotated states, field validation, API dependencies and assets.

**Design sign-off criterion:** A reviewer can complete a realistic moving request, select a quote, understand payment, assign a team, simulate the move, confirm delivery, and handle one cancellation or dispute without inventing missing screens.

## 4.5 Development phases and exit criteria

Do not assign a delivery date until team size, design completion, integrations, and approved scope are known. These are sequenced work packages rather than a fixed schedule.

| Phase | Work | Exit criterion |
|---|---|---|
| 0. Discovery | Confirm business assumptions, service areas, policies, roles and integrations | Approved scope and recorded unresolved decisions |
| 1. UI/UX | Journeys, wireframes, visual system and prototype | Four-role prototype covers main flow and critical exceptions |
| 2. Foundation | Repository, auth, permissions, CI, environments, contract definitions | Each role accesses only its authorized area; baseline builds pass |
| 3. Supply onboarding | Vendor application/review, areas, services, workers and vehicles | Approved vendor can become serviceable and invite workers |
| 4. Marketplace | Customer request, matching, quote revision/comparison | Customer receives and compares valid local quotes |
| 5. Booking/finance | Reservation, provider integration, cancellation/refunds, ledger | Repeated/concurrent operations remain correct in sandbox tests |
| 6. Fulfillment | Assignment, milestones, proof, change orders and completion | Team completes a staged job with correct customer timeline |
| 7. Operations | Support, disputes, reviews, reconciliation, settlements, reports | Admin resolves realistic exceptions with traceable records |
| 8. Pilot readiness | Accessibility, performance, security checks, backups and training | Pilot checklist passes and named operators own alerts/support |
| 9. Pilot | Limited geography and vendor group; monitor and fix | Evidence supports expansion or identifies needed changes |

## 4.6 Testable acceptance criteria

| ID | Scenario | Pass condition |
|---|---|---|
| AC01 | Unapproved vendor requests leads | Access denied; no customer lead data disclosed |
| AC02 | Vendor A guesses Vendor B's booking ID | Access denied or safely not found; event audited where appropriate |
| AC03 | Customer submits a valid local request | One open request created; eligible vendors receive deduplicated invitations |
| AC04 | No eligible vendors | Customer sees clear no-availability state; no false quote/booking is created |
| AC05 | Customer changes inventory after quotes | Prior revision quotes cannot be accepted; vendors can quote current revision |
| AC06 | Two quote acceptances race | Exactly one active reservation succeeds; loser gets a conflict |
| AC07 | Customer repeats checkout request | Same logical payment order/result is returned, with no duplicate charge intent |
| AC08 | Payment webhook repeats or arrives out of order | One financial effect and one confirmation; state does not regress |
| AC09 | Payment succeeds after reservation expires | Reconciliation follows explicit policy; no second booking allocation |
| AC10 | Vendor assigns overlapping vehicle/worker jobs concurrently | At most one conflicting reservation succeeds |
| AC11 | Removed worker tries to read or update old job | Server rejects access even if app cached an old role/job screen |
| AC12 | Worker skips loading and reports transit | Invalid transition rejected with authoritative state |
| AC13 | Worker is offline | Draft clearly marked unsynced; reconnect does not duplicate events or silently overwrite state |
| AC14 | Extra service is proposed | Agreed price remains unchanged until customer approval; accepted delta is recorded |
| AC15 | Customer cancels confirmed job | Policy snapshot determines fee/refund; all parties see correct status |
| AC16 | Refund is approved but provider fails | Refund remains failed/pending retry; UI does not claim money returned |
| AC17 | Customer confirms delivery | Required proof/confirmation is recorded and service completes once |
| AC18 | Worker tries own-job confirmation without customer proof | Rejected; documented admin fallback remains separately authorized |
| AC19 | Booking has dispute or unpaid balance | Settlement cannot proceed contrary to configured eligibility policy |
| AC20 | Customer reviews another person's booking | Rejected; one review maximum per eligible booking |
| AC21 | Private file URL requested by unrelated user | Access denied; direct storage objects are not public |
| AC22 | Admin changes commission config | Existing booking snapshot remains unchanged; new rule is versioned |
| AC23 | Notification service is unavailable | Booking still commits; notifications retry with visible operational failure tracking |
| AC24 | Backup restored in test environment | Documented recovery succeeds and provider financial reconciliation is demonstrated |

Use unit tests for pricing/policy/state rules, integration tests for authorization and concurrent database operations, provider sandbox tests for finance, and end-to-end tests for the four-role booking journey. Manually test mobile permissions, accessibility, poor connectivity, and actual worker usability.

## 4.7 Pilot operations checklist

- Named owner for vendor verification, customer support, finance reconciliation and production alerts.
- Approved service catalog, coverage, cancellation terms, dispute rules and payment setup.
- Real onboarding instructions and a small verified vendor group with trained workers.
- Customer-facing support contacts and operational hours.
- Tested payment, refund, cancellation, provider failure and vendor no-show paths.
- Tested backups, restore, rollback, access revocation and sensitive log filtering.
- Clear policy for worker evidence capture and customer document/photo retention.
- Daily pilot review of unquoted requests, unassigned bookings, delayed jobs, pending payments and unresolved disputes.

## 4.8 Risks and responses

| Risk | Practical response |
|---|---|
| Too few vendors | Launch in a small area with vendors onboarded before customer promotion |
| Quote disputes | Structured inventory, access fields, explicit inclusions and approved change orders |
| No-show or resource conflict | Assignment deadlines, acceptance tracking and an operations exception queue |
| Off-platform booking | Convenient payments, documented scope, support and reliable vendor value; measure leakage |
| Damage or loss | Evidence workflow, clear reporting process and approved responsibility terms |
| Poor worker connectivity | Lightweight screens, queued drafts, visible synchronization and server validation |
| Finance mismatch | Immutable transaction history, idempotency and recurring reconciliation |
| Scope growth | Preserve the MVP boundary and record approved changes with design/API impact |

## 4.9 Project documentation acceptance

This documentation stage is complete when the team has a shared understanding of the roles, scope, normal and exception flows, state transitions, architecture, data ownership, and next-phase deliverables. Business decisions marked as proposals still require confirmation before being turned into binding product rules.

The next authorized stage can be UI/UX design. Application code should follow approved journeys and API contracts, rather than being presented as complete before these choices are resolved.
