# Proposed product pattern masters

This is a read-only design-system audit of active Figma screens outside library
pages 19 and 20. These are proposals for a later design-library review, not
implemented or approved Figma masters. No Figma library nodes were changed and
no code parity is implied by this document. Screen-frame contexts included
Figma screenshots; metadata was used to locate concrete child nodes.

## Recurring product compositions

| Proposal                 | Screen evidence                                                                                                                                                   | Repeated contract worth standardizing                                                                                                               | Intended code owner                                                    | Recommendation                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RunRecord`              | Page 12 Agent Runs & Handoffs: overview `67:3`, inventory row `67:140` (1068 × 111)                                                                               | Run ID/title, feature and input provenance, status, and a view action. The overview uses the same run summary in a shorter 682 × 95 form (`67:60`). | `apps/web/src/features/workbench/components/RunRecord/`                | Add a page-20 product master with `compact` and `inventory` compositions and status variants that preserve human-reported vs process telemetry meaning.                                                                   |
| `HandoffReviewPanel`     | Page 12: overview panel `67:75` (371 × 212), inventory and handoff journey screens in the same page                                                               | Ready-count, review explanation, and explicit navigation to the handoff record.                                                                     | `apps/web/src/features/workbench/components/HandoffReviewPanel/`       | Add a product master with `empty`, `ready`, and `blocked` states; use generic Badge/Button/Card contracts underneath.                                                                                                     |
| `EvidenceCoverageRow`    | Page 14 Evidence & Releases: overview row `76:60` (681 × 64), repeated with Acceptance Criteria `76:65`, Git/source metadata `76:70`, and Packaging Rules `76:75` | Scope label, one-line evidence explanation, and an independent outcome badge (`VERIFIED`, `PARTIAL`, `OBSERVED`, `NOT EVALUATED`).                  | `apps/web/src/features/delivery/components/EvidenceCoverageRow/`       | Add one page-20 product master with explicit outcome variants; never encode outcomes by color alone. This does not replace generic `RecordRow` or `StatusChip`.                                                           |
| `GitObservationHistory`  | Page 10 Repositories & Context: repository detail `57:128`, history block `57:185` (1104 × 297), repeated observation entries `57:188`, `57:193`, `57:198`        | Observation timestamp/version header, labeled repository facts, separators, and read-only provenance.                                               | `apps/web/src/features/repositories/components/GitObservationHistory/` | Add a product master with `current`, `stale`, and `unavailable` observation states. Compose `KeyValueRow`, `Divider`, and `StatusChip`; keep Git semantics feature-owned.                                                 |
| `TransferStepper`        | Page 16 Project Transfer: source-selection screen `87:3`, stepper `87:39` (1120 × 54), steps `87:40`, `87:42`, `87:44`; repeated on review step `87:84`           | Three ordered phases, current/completed/upcoming step state, and a fixed review/confirmation flow.                                                  | `apps/web/src/features/transfer/components/TransferStepper/`           | Prefer a page-20 feature composition built from generic `StepperStep` (`181:255`) rather than adding a duplicate generic stepper family. A future page-20 master can define the transfer-specific three-step arrangement. |
| `TransferPayloadSummary` | Page 16: import context `87:62`; review screen `87:143` and detail panel `87:160`                                                                                 | Destination, creation scope, included and excluded data, and validated object totals before confirmation.                                           | `apps/web/src/features/transfer/components/TransferPayloadSummary/`    | Add a product master with `source`, `review`, and `confirmation` variants. Make exclusions and no-save-before-confirmation explicit.                                                                                      |

## Screen concepts not ready to become masters

- **Workspace context / workspace card:** Page 17's `98:10` workspace context and
  `98:47`/`98:60` workspace cards belong to `UX-00 / Navigation proposal`.
  Reuse and test the existing page-20 `WorkspaceSwitcher` (`229:40`) contract
  first; do not promote proposal-only card styling into a new master without a
  product-design decision. If later approved, ownership belongs to the
  application shell, not `@forge-org/ui`.
- **Journey cards:** Page 18's journey hub `133:3`, cards `133:47`, `133:50`,
  `133:53`, `133:57`, `133:60`, `133:63`, and `133:66` are in the
  `Advanced UX-00` exploration. Existing page-20 product cards should be
  evaluated for reuse; no separate `JourneyCard` master is recommended until
  that exploratory navigation becomes an approved product screen.
- **Repository connection disclosure:** Page 10's connect dialog `57:108` and
  privacy block `57:120` are well-covered by existing generic `Dialog` and
  product `TrustDisclosure` (`229:471`) contracts. Improve their compositions
  in the repositories feature rather than add a near-duplicate master.
- **Handoff provenance and evidence summary:** Existing page-20
  `ProvenanceNotice` (`229:458`), `TrustDisclosure` (`229:471`),
  `VerificationSummary` (`229:515`), and `ReleaseGate` (`229:534`) are relevant
  canonical masters. The proposals above cover only recurring row/panel
  compositions not represented by those masters.

## Evidence and limits

Read-only metadata and design contexts were inspected for pages 10 (`57:2`),
12 (`67:2`), 14 (`76:2`), 16 (`87:2`), 17 (`98:2`), 18 (`133:2`), and the
Workspace Home screen `4:32`. Concrete contexts included RunRecord `67:140`,
Handoff panel `67:75`, coverage row `76:60`, observation history `57:185`,
transfer stepper `87:39`, workspace context `98:10`, and journey card `133:47`.
Screen dimensions and repeated child nodes come from live page metadata; the
proposal names and variant recommendations are engineering inferences for
future human design review, not facts asserted by the Figma file.
