# Documentation index

Start with the product contract, then the architecture. Everything else is either operational or historical.

## Active (describes the shipping 1.0 product)

- [Product contract](product/mvp-1.0.md) and [charter](product/charter.md)
- [Today, the default landing page](product/today.md)
- [Architecture](architecture/README.md), [decision records](architecture/decisions), [data model](architecture/data-model.md), [client components](architecture/client-components.md), [transfer conformance](architecture/transfer-conformance.md)
- [Import / export](import-export/README.md)
- [Quality and acceptance](quality/mvp-1.0-acceptance.md)
- [Design intent and parity](design/figma.md)
- [Releasing a preview](operations/releasing-preview.md)
- Specs for retained areas: [ORG-001](specs/ORG-001-organization), [ORG-002](specs/ORG-002-planning), [ORG-007](specs/ORG-007-transfer), [ORG-008](specs/ORG-008-desktop), [ORG-009](specs/ORG-009-web-surfaces)

## Optional capabilities (opt-in, not required by the local product)

- BYOC cloud mode (Supabase owned by the user): [byoc-supabase](operations/byoc-supabase.md), [due dates migration](operations/byoc-due-dates-migration.md), [byoc-0.2](architecture/byoc-0.2.md), [parity](byoc-0.2-parity.md), [verification](operations/byoc-0.2-verification.md)
- Android shell (cloud-only, native certification blocked): [android-0.1](architecture/android-0.1.md)

## Historical (kept for traceability, not current behavior)

- Retired product areas: [ORG-003](specs/ORG-003-readiness), [ORG-004](specs/ORG-004-repositories), [ORG-005](specs/ORG-005-runs), [ORG-006](specs/ORG-006-delivery)
- Foundation milestones: [M0 preservation](specs/M0-preservation), [M1 foundation](specs/M1-foundation), [RFC-001](architecture/RFC-001.md)
- Earlier BYOC iterations: [byoc-0.1](architecture/byoc-0.1.md)
- [Release notes](releases/v0.1.3-preview.1.md)
