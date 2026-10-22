# UX-02 Complete Product Workflows

**Status:** Approved for autonomous implementation
**Baseline:** `05a135d2ec0eea2c9284bc35ca1869da0ad533b7`
**Repository:** `JoseAngelValadezBarajas/forge-org-tool`, existing PR #1

## Outcome

Turn the existing FORGE reconstruction into a connected product experience,
not a collection of route-level screens. A user must be able to navigate and
finish supported workspace, planning, run/handoff, evidence/verification,
repository/context, and project transfer workflows with persistent state,
accurate feedback, and domain-truthful status.

## Constraints

- Preserve ORG-001–009 contracts, migration behavior, supported URLs, and
  restricted authenticated Tauri transport. Prefer existing API operations;
  any necessary new operation must have a specified contract and API tests.
- Persist durable state through the API. Do not use browser state as a
  substitute for domain persistence or readiness rules.
- Keep `REPORTED`, `OBSERVED`, `VERIFIED`, and `NOT_PUBLISHED` distinct. FORGE
  records reported work; it does not execute agents, independently verify
  activity, or publish deployments.
- Do not fabricate workspace metrics, repository content, evidence, checks,
  or Figma example records. Preserve append-only events and immutable handoff,
  observation, and context-package history.
- Retain metadata-only local repository observation. No source scanning,
  arbitrary commands, remote Git, network access, or broader Desktop
  capabilities.
- Keep generic controls in the established shared packages and product
  compositions in feature-owned `features/<feature>/components/<Component>/`
  boundaries. Do not restart package/theme architecture.
- Do not migrate original FORGE data, alter real user data, modify canonical
  Figma, publish packages, archive original FORGE, or merge PR #1.
- Treat Figma pages 19/20 as shared/product pattern references and concrete
  screens as composition intent. Browser captures are automated evidence;
  human visual certification requires external review.

## User-visible contracts

1. Workspace Home summarizes only records and rules the backend can support,
   exposes project navigation/actions, attention, recent activity, search,
   filters, and useful empty/loading/error/recovery states. Unsupported Figma
   metrics are replaced by truthful equivalents and documented.
2. Planning connects workspace, project, epic, feature, task, criteria,
   dependencies, manual state transitions, board, and readiness context.
   Planning state is never described as independently verified implementation.
3. Runs and Handoffs provide run detail, chronological append-only activity,
   human event entry, draft/edit/validation/ready queue, review/acknowledgement,
   immutable revision history, and JSON/Markdown downloads.
4. Evidence and Verification provide evidence inventory/detail/provenance and
   status/invalidation; supported rule configuration/preview/evaluation;
   result trace; candidate history; explainable gates; and manifest preview/
   download. A check proves only its recorded condition; candidates remain
   `NOT_PUBLISHED`.
5. Repository and Context journeys provide guided local connection,
   validation/recovery, repository detail, bounded observation/history,
   feature association, context preview/save/history, and JSON/Markdown
   download, preserving provenance.
6. Project transfer guides source selection, validation/preview, fingerprint
   review, reviewed import commit and errors; and project selection, export
   review, versioned document generation, and actual file download. Preserve
   limits, duplicate rejection, cycles, new identifiers, and planning-only
   semantics.
7. Global/context navigation, breadcrumbs, search/commands, active states,
   keyboard names/focus, responsive shell, and error recovery expose all
   capabilities without breaking supported URLs.

## Figma evidence inspected

Concrete screen contexts were retrieved for Workspace Home `4:32`, Run Record
`67:140`, Delivery Overview `76:3`, Import Stepper `87:39`, and Observation
History `57:185` in `r10szKLgiIPVi2NBmbjTpm`. They establish composition intent;
sample records are not product truth. Remaining workflow frames must be
checked as each owning feature is implemented. No human visual certification
is implied.

## Verification contract

For each changed behavior, add a focused failing test first and observe the
expected failure, implement the smallest persistent/API-backed workflow,
then verify focused tests and regressions. Browser tests must use isolated
synthetic databases and real navigations/actions; capture loaded product
content at 1440, 1280, 1024, 390, and 375px in Dark/Light as supported. Correct
the misnamed Planning capture and retain separate Planning and Readiness
captures. Run frontend/type/architecture/package checks, OpenAPI and backend
checks for API changes, Chromium journeys, production route exclusion,
Desktop Rust/build/smoke checks, and GitHub Quality CI. Document precise
limitations and Figma deviations; obtain an independent read-only review.

## Delivery waves

- **A:** Workspace, Planning, navigation.
- **B:** Runs, Handoffs, Repositories, Context.
- **C:** Evidence, Verification, Delivery, Transfer.
- **D:** Cross-feature integration and full browser journeys.
- **E:** Independent review, focused fixes, and certification.

These are internal checkpoints, not approval stops. The implementation must
continue across all waves; routes without finishable, persistent journeys do
not satisfy acceptance.
