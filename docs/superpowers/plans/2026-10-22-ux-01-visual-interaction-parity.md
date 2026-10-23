# UX-01 Visual and Interaction Parity — Implementation Plan

**Baseline:** `e9219be29ea2b97684a8ffe72964fa9b96975ddf`  
**Design source:** Figma `r10szKLgiIPVi2NBmbjTpm`, Foundations frame `2:45`, Core UI page `173:2`, Product Patterns page `229:2`, and concrete product-screen frames in the parity register.  
**Execution:** incremental corrections to shared components, then real feature-screen composition and isolated browser evidence. No Figma writes, package publishing, PR merge, original Forge archival, or real-data mutation.

## Global Constraints

- Preserve ORG-001–009 routes, behavior, domain truth, public package contracts, and development-only `/__components`.
- Generic primitives stay in `@forge-org/ui`; business compositions remain feature-owned. No duplicate controls or speculative variants.
- The original checkout's two deletions (`FORGE_Org_Tool_Architecture_RFC_v0.2.md`, `FORGE_Org_Tool_Codex_M0_M1_Prompt.md`) and `package-lock.json` modification are out of scope and must remain untouched.
- Every visual correction needs node-backed Figma evidence. Do not change global palette or infer production dimensions from specimen bounds.
- Keep visual review separate from automation. Never mark a component human-certified; use `PASS_AUTOMATED`, `NEEDS_CHANGES`, `REQUIRES_DESIGN_DECISION`, `READY_FOR_HUMAN_REVIEW` accurately.
- Browser tests must use disposable synthetic data, strict isolated server startup, deterministic viewport/theme, and loaded content. Do not weaken assertions or regenerate baselines to conceal differences.

## Design

Retain the existing package/token/feature ownership architecture. Correct evidenced shared primitive differences at their source, then adjust real screens through those primitives. Split the Component Host by catalog responsibility, avoiding a second JSX-heavy registry. Use focused tests for public component behavior and browser tests for pointer, keyboard, responsive, and theme behavior. Track implementation and human visual review independently. Missing masters and ambiguous Figma specimen interpretations are decisions, not defects to fabricate around.

## Tasks

### Task 1: Baseline and visual evidence

- Verify clean isolated worktree at the stated baseline and run frontend, package, and isolated Chromium baselines.
- Inspect actual product and Component Host at 1440/1280/1024/390/375 widths, Dark/Light, after content and fonts are ready. Capture screenshots before implementation.
- Record failures and exact screenshot paths; do not claim parity from source inspection alone.
- Confirm Playwright uses `reuseExistingServer: false`, `--strictPort`, disposable API state.

### Task 2: Shared component corrections (TDD)

- Add failing focused tests before implementation for Button states/contracts and Card layout/root contract.
- Align Button typography, surface/foreground variants, hover/pressed/focus/disabled/loading treatments to `173:27` with semantic tokens; preserve public API, disabled/loading semantics, focus-visible, and action label. Keep sizing unchanged unless Figma confirms whether the 40px focused specimen includes its focus ring; document current 40px versus 36/38px defaults as a design decision.
- Align Card radius and padding to `173:65` only for properties owned by the generic Card; preserve neutral default root, typed semantic root, refs/native props, responsive width.
- Audit remaining Core families; implement only evidenced differences and add regressions for changed contracts.
- Verify UI tests/build and browser-computed styles for representative states.

### Task 3: Component Host modularization

- Split the catalog into owned modules for shell/navigation, foundations, actions, forms, navigation, surfaces/data, feedback/overlays, product patterns, icons, and parity status; keep examples with their component/category and metadata declarative.
- Preserve actual public package exports, `/__components`, development-only routing and production exclusion.
- Add host tests for navigation, previews, theme and narrow responsive behavior.
- Verify host tests, architecture checks, production build, and explicit route exclusion.

### Task 4: Foundations and actual screen quality

- Map Foundation frame `2:45` to real `@forge-org/tokens` values and document comparison evidence. Do not silently change canonical palette.
- Compare Workspace Home, Organization/Projects, Planning, Epic/Feature Detail, Board, Readiness, Repositories, Context Packages, Runs/Handoffs, Evidence/Delivery, Transfer, shell/navigation against concrete screen frames.
- Fix substantial supported deviations in feature-owned code; preserve functional workflows, routes, accessibility, responsive behavior, and truthful domain states. Record missing masters/ambiguous alternatives as design decisions or UX-02.
- Verify focused feature tests; run API checks only if API contracts change (not intended).

### Task 5: Interaction and responsive regressions

- Cover Dialog focus/dismiss/restore, Popover positioning/focus/outside dismissal, Tooltip keyboard access, MultiSelect controlled/uncontrolled behavior, Tabs keyboard navigation, search/form validation, focus-visible, pointer/touch, and reduced motion where present and not adequately covered.
- Add deterministic synthetic browser evidence for host and representative real screens in Dark/Light. Test the five widths; retain desktop/mobile screenshots with viewport/theme/state metadata. Preserve console/network assertions.
- Verify focused component tests and isolated Chromium journeys; no static screenshot in place of interaction.

### Task 6: Parity register and certification

- Update `docs/design/component-parity.md`, `docs/design/design-system-parity.json` where applicable, and `docs/evidence/m1/verification.md` or UX-01 evidence with current commit, screenshot links, viewport/theme/state, automation, and human-review boundary.
- List exact remaining human design decisions; retain `NOT_HUMAN_REVIEWED` statuses.
- Run formatting, lint, typecheck, token/architecture checks, package builds and packed consumers, component/frontend tests, production build/route exclusion, isolated Chromium, applicable API/Desktop checks, and GitHub Quality CI.
- Report `UX_01_READY_FOR_HUMAN_VISUAL_REVIEW` only if implementation and automated gates pass; otherwise report `UX_01_BLOCKED` and exact remaining evidence.

## Review Focus

- Every visual correction traces to a concrete Figma node; no inferred sizing or colors.
- Shared components preserve accessibility/public contracts and real consumers.
- Catalog modules have meaningful ownership and no new monolithic JSX registry.
- Screenshots show loaded actual app/host content and requested viewport/theme, using deterministic synthetic data.
- Human design review remains explicit; no unrelated local changes, PR merge, Figma edits, package publishing, or real-data operations.
