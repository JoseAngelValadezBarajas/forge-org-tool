# Functional reconstruction implementation plan

This plan is subordinate to M0/M1. Stage 1 functionality is blocked until
M1 passes owner review and continuation is explicitly approved.

## Delivery stages

1. **Foundation closeout (M0/M1).** Verify preservation manifest and public
   repository, Apache-2.0 provenance, architecture checks, SDD/TDD evidence,
   Chromium foundation smoke, and CI. Current output is reviewable, not a
   parity claim.
2. **ORG-001 vertical slice.** Specify and test workspace/project persistence,
   selection, empty/error states, and API contracts end to end. This is the
   first implementation slice after approval.
3. **ORG-002 vertical slice.** Add planning hierarchy and board behavior with
   explicit manual-planning truth states; do not imply delivery evidence.
4. **ORG-003 vertical slice.** Add revisioned decisions/invariants and
   readiness evaluation with frozen inputs and revision-aware acknowledgements.
5. **ORG-004 vertical slice.** Add bounded read-only Git observation and
   immutable context packages; keep source scanning, remotes and network
   operations out of scope.
6. **ORG-005 vertical slice.** Add human-reported runs and immutable handoffs;
   never represent them as agent execution or CI results.
7. **ORG-006 vertical slice.** Add evidence, verification and release-candidate
   gates with explicit `NOT_PUBLISHED`/blocked states.
8. **ORG-007 transfer slice.** Add versioned import/export only after the
   internal domain contract is stable; validate invalid fixtures and preserve
   provenance.
9. **ORG-008 desktop slice.** Only after web/API parity evidence: implement
   the constrained Windows bridge and installed-product smoke.

## SDD/TDD loop for every slice

Write the slice spec and acceptance matrix first. Add contract tests and a
failing domain/application test. Implement the smallest vertical path across
domain, application, API, client and feature UI. Add browser evidence for the
user path, then run full CI and record the exact commit and evidence links.
Manual planning notes are never acceptance evidence.

## Parallelization

After ORG-001 contracts stabilize, independent tracks can work in parallel:

- API/domain contracts and migrations;
- feature UI and browser tests;
- tokens/UI primitives and Figma reconciliation;
- test fixtures, contract snapshots and documentation.

Integration is serial at the contract boundary. Desktop and import/export
remain downstream because they depend on stable API and domain contracts.

## Risks and controls

| Risk | Control |
| --- | --- |
| Re-licensing legacy code or assets accidentally | Evidence-only source boundary; Apache provenance check; no copy/paste from PolyForm source. |
| Overbuilding speculative features | Capability IDs and owner approval gate; no unlisted Stage 1 work. |
| Truth-state inflation | Separate manual, reported, verified and published states in contracts and UI. |
| Cross-layer drift | Boundary tests, public feature APIs, generated tokens and OpenAPI contract checks. |
| Visual imitation without evidence | Figma review plus retained Chromium desktop/mobile screenshots and console/network checks. |
| Desktop capability leak | Rust-owned allowlist and route policy; React receives no arbitrary process, URL or filesystem capability. |
