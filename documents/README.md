# Local Movers Marketplace — Project Documentation

**Working name:** Local Movers Marketplace  
**Document date:** 10 September 2026  
**Stage:** Requirements and process design; application implementation has not started.

This platform connects people shifting homes with local packers-and-movers vendors. Customers request a move and select a quote. Vendors manage quotes, bookings, vehicles, and workers. Workers execute assigned jobs. Admins operate the marketplace and handle exceptions.

## Read in this order

1. [Project scope and business rules](docs/01-project-scope.md)
2. [Functional requirements and process flows](docs/02-functional-requirements-and-flows.md)
3. [Architecture, data model, and API specification](docs/03-technical-specification.md)
4. [UI/UX preparation, delivery plan, and acceptance criteria](docs/04-delivery-and-ux-plan.md)

## Proposed product surfaces

| Audience | Product | Technology |
|---|---|---|
| Customers | Mobile app | React Native |
| Workers | Separate role-based area in the mobile app | React Native |
| Vendors | Responsive management portal | Next.js |
| Admins | Restricted operations portal | Next.js |
| Public visitors | Service information and vendor application website | Next.js |
| All products | Shared business API | Express running on Node.js |
| Backend | Operational database | MongoDB |

Customers and workers sharing one mobile codebase is a proposed MVP simplification. They receive different navigation and permissions. Separate apps can be introduced later.

## Status of decisions

The technology stack, four user roles, marketplace purpose, and documentation-first approach come from the project brief. Quote-based booking, the payment approach, launch geography, cancellation rules, and commission policy are **proposals**, not confirmed requirements.

These documents are a planning baseline. They contain no working application, live integration, legal advice, or commitment to a payment provider. Version-specific framework and provider choices must be checked during implementation.
