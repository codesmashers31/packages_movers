# 1. Project Scope and Business Rules

## 1.1 Understanding the project

When a tenant or homeowner shifts to another house, they need someone to pack, load, transport, unload, and sometimes unpack their belongings. Local moving businesses provide these services, but customers often have to call several vendors, repeat their requirements, compare unclear prices, and coordinate workers manually.

This project creates a marketplace between those customers and local moving vendors. The platform organizes discovery, quoting, booking, job updates, and support. It does not automatically own moving trucks or employ each vendor's workers; vendors remain responsible for delivering their accepted services. The exact contractual responsibilities must be agreed before launch.

**Example:** A customer moving from a rented 1BHK home submits pickup and delivery details, item information, access conditions, and a preferred date. Eligible local vendors receive the request and submit itemized quotes. The customer accepts one quote and pays any required advance. The vendor assigns a team and vehicle. Workers update the move status, and the customer confirms delivery. The platform records completion, collects feedback, and manages any issue.

## 1.2 Goals and success measures

| Goal | Suggested measurement |
|---|---|
| Make finding movers easier | Percentage of valid requests receiving at least one quote |
| Improve response speed | Median time from request submission to first quote |
| Build customer confidence | Completed bookings, verified reviews, dispute rate |
| Help local vendors gain work | Active approved vendors, quote acceptance rate |
| Improve operational visibility | Jobs with timely assignment and status updates |
| Create a sustainable business | Commission earned after refunds, payment costs, and support costs |

Set numerical targets after the pilot. Define each metric's denominator and time window before using it to compare performance.

## 1.3 Actors and responsibilities

| Role | Responsibilities | Important restrictions |
|---|---|---|
| Customer | Manage own profile, request moves, compare quotes, book, pay, follow status, raise issues, review | Cannot see another customer's data or alter vendor pricing |
| Vendor owner/manager | Apply for approval, manage services, quote, assign staff/vehicles, monitor jobs, view own finances | Cannot see other vendors' quotes, workers, or finances |
| Worker | View assigned jobs, accept assignment, report progress, capture authorized proof, report issues | Cannot change quotes, collect arbitrary charges, or view platform finances |
| Admin | Review vendors, manage service areas, supervise bookings, resolve disputes, manage policy/configuration | Sensitive actions require permission and an audit trail |

An account may hold multiple approved memberships, such as customer and worker. Switching roles changes the interface, but the server independently verifies permissions for every request.

## 1.4 Proposed MVP boundary

**Launch assumption:** Start in one selected city and nearby approved areas, with local residential moves. Tamil and English support should be considered during UI/UX because of the target audience; the initial language set is not yet confirmed.

Included:

- Phone-based login and account recovery process.
- Customer and worker mobile journeys.
- Vendor registration, document submission, admin approval, and suspension.
- Service area and service-package management.
- Residential moving requests with items, photos, addresses, and access details.
- Vendor eligibility matching and itemized quotes.
- Quote comparison, selection, and booking reservation.
- One selected online payment provider, if the business uses online advances.
- Booking cancellation, refund requests, and operational exception handling.
- Vendor worker/vehicle assignment and worker progress updates.
- Customer delivery confirmation, support tickets, disputes, and reviews.
- Notifications and basic administrative reporting.

Deferred unless the business explicitly expands the MVP:

- Interstate/international relocation and complex commercial moves.
- Continuous live GPS tracking and route optimization.
- Automatic or AI-generated binding prices.
- Auctions, dynamic bidding rounds, subscriptions, and promotional wallets.
- Warehousing, insurance product sales, equipment rental, and recurring contracts.
- Multi-vendor fulfillment of one booking.
- Automated marketplace payout splitting unless required by the selected payment model.
- A separate worker app binary and a full customer web booking application.

Status updates are part of MVP; they should not be presented as live location tracking.

## 1.5 Services and request information

The initial service catalog can offer packing, loading, transport, unloading, unpacking, and basic furniture disassembly/reassembly. Each vendor must explicitly identify which services it includes. Specialized handling is an additional agreed service, not an assumed inclusion.

A move request should collect:

- Customer contact and a preferred communication language.
- Pickup and destination addresses, map location when available, and local landmarks.
- Property type or home size, floor, lift availability, stairs, parking access, and distance from parking to the door at both ends.
- Preferred moving date and time window, with flexibility if applicable.
- Item list and approximate quantities; bulky, fragile, and high-value item declarations.
- Optional item/access photos and special handling notes.
- Packing, unpacking, labor, vehicle, and assembly requirements.
- Customer acknowledgement of the agreed excluded/prohibited item policy.

Photos can reveal private household information. Explain their purpose and share them only with eligible vendors who need them. Exact addresses and direct contact details should ordinarily be released after confirmed booking; pre-booking views show locality and necessary access information.

## 1.6 Commercial model — proposal to validate

The recommended planning baseline is a commission per successfully completed booking. Store the applicable commission rule with each booking so future configuration changes do not rewrite existing agreements.

Possible payment arrangements:

| Model | Consequence |
|---|---|
| Platform collects full customer payment | Strong payment visibility; requires a defined vendor settlement and refund process |
| Platform collects an advance; balance paid directly to vendor | Lower online amount; weaker balance-payment visibility and commission reconciliation |
| Customer pays vendor directly; platform invoices commission | Simplest customer payment integration; greater collection and off-platform leakage risk |

For process examples, assume the platform collects an advance and a remaining online balance through a provider, then settles the vendor according to an agreed policy. This is a **design assumption**, not a decision to hold funds or an assertion that any particular arrangement is permitted. Validate the provider's supported marketplace flow and contractual setup before implementing payments. Do not describe the platform as an escrow service unless that arrangement is actually established.

Illustrative calculation only: a ₹10,000 agreed service amount, a 20% advance, and a 10% commission would imply a ₹2,000 advance, ₹8,000 remaining amount, and ₹1,000 commission before tax, fees, or adjustments. These percentages are not approved business rules. Taxes, fee responsibility, rounding, and invoice ownership remain unresolved.

## 1.7 Quote and price rules

- Vendors submit fixed itemized quotes for the customer's current request revision.
- Each quote includes currency, service lines, quantities, discounts, applicable tax lines if configured, total, exclusions, validity, and service time window.
- Vendors can mark that a survey is required before they can issue a final quote. A survey estimate cannot be booked as a binding final price.
- Quotes must state assumptions such as lift access and item counts.
- No vendor can see a competitor's quote amount.
- Editing material request details invalidates affected quotes and requires fresh confirmation.
- Booking stores an immutable snapshot of the accepted quote and cancellation policy.
- Additional items or services require a documented change order approved by the customer before a price increase is applied. Workers cannot make unilateral price changes.
- Quote comparison must distinguish included services, total amount, timing, and exclusions; price alone is insufficient.

## 1.8 Vendor and worker rules

- A vendor can receive leads and submit quotes only while approved and active for the relevant service area.
- Required vendor documents are configurable after the business confirms launch-country requirements. Verification status must not imply checks that were never performed.
- Vendors invite workers; workers verify their own account and accept membership.
- A worker can access only jobs assigned through an active vendor membership. Cross-vendor sharing is never implicit.
- The MVP may restrict each worker to one active vendor membership to simplify scheduling; this requires confirmation.
- Vendors must not double-book workers or vehicles for overlapping assignment windows.
- Suspending a vendor blocks new business but creates an admin queue for existing bookings; it must not silently cancel ongoing moves.

## 1.9 Cancellation, failure, and dispute policy

The application needs a configurable policy with cancellation cutoffs, fees, vendor no-show handling, customer no-show handling, and refund eligibility. The business must approve the actual values before launch.

- Before quote acceptance, a customer may close an open request.
- A pending-payment reservation expires after a configurable window; late payment success goes to reconciliation, not an automatic duplicate booking.
- A confirmed booking cancellation records the actor, reason, applicable policy snapshot, fee calculation, refund decision, and notifications.
- After work begins, use an exception/dispute process instead of allowing a normal self-service cancellation that conceals performed work.
- If a vendor cannot fulfill a booking, notify the customer and admin. Another vendor requires a new customer-approved quote; never silently replace the contracted vendor.
- A dispute records evidence, participants, requested remedy, deadlines, admin decision, and financial adjustments.
- Delivery confirmation is not a waiver of damage or service complaints. A configured reporting window governs later issues.
- Refund completion requires provider confirmation. An approved refund is not yet a completed refund.

## 1.10 Decisions needed before UI/UX sign-off

| Decision | Proposed starting point | Owner |
|---|---|---|
| Product name and branding | Temporary working name | Business |
| First city and covered radius/localities | One city pilot | Business |
| Languages | English and Tamil | Business |
| Booking method | Multiple vendor quotes, customer chooses | Business |
| Payment collection and settlement | Online advance and balance; provider-supported vendor settlement | Business/finance |
| Advance, commission, fees, and taxes | Configurable; values undecided | Business/finance |
| Cancellation and dispute windows | Configurable; values undecided | Operations |
| Verification documents and process | Admin-reviewed vendor application | Operations |
| Customer/worker app packaging | One codebase with separate role areas | Product |
| Worker membership model | One active vendor in MVP | Operations |
| Survey workflow | Vendor requests clarification/survey before final quote | Operations |
| Operational support hours and escalation | To be defined | Operations |

The specification can proceed with these assumptions. Designs and implementation should revisit any decision that changes customer promises or financial behavior.
