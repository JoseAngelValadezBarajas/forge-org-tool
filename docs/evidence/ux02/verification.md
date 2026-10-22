# UX-02 Workflow Verification

**Implementation:** `75b52a12edaf46a45df5138a9c7b74c6704fcf84`<br />
**Follow-up API test lint fix:** `fca1e5a3615d3c1c1759ef2b641e8c811163829a`<br />
**CI async assertion fix:** `6b7bea78e2e514046574377bc2d9964350772f17`<br />
**Browser locator correction:** `8ba32aa`<br />
**Branch:** `codex/forge-reconstruction-vertical-slices` (PR #1 remains open)

## Automated evidence

- `npm test`: passed. Architecture, design-system/token validation, generated
  OpenAPI type consistency, TypeScript, package tests, consumer contract, and
  frontend tests passed; frontend: 58 files / 157 tests.
- `npm run lint:frontend`: passed with zero warnings. Python Ruff passed.
- `uv run --project apps/api --locked pytest`: 32 passed, including API,
  migration, transfer, and Desktop sidecar/installed-smoke Python tests.
- `npm run build`: passed, including the production Component Host exclusion
  check.
- Isolated Playwright Chromium run: 24/24 passed across desktop and mobile;
  disposable SQLite database, strict non-reuse web/API servers, synthetic
  records only.
- `npx prettier --check .` and Ruff format check passed. `cargo` is not
  installed in this local environment, so rustfmt, Clippy, and native Desktop
  build could not be run locally.
- Quality CI run `39843730344` on `33f4f942f64f620759915f995b4e5206fa3b2455`
  passed API and Desktop, then exposed two asynchronous test assertions that
  observed loading states in the web suite. The assertions now wait for the
  package fingerprint and complete filtered result; the full `npm test` passes
  locally after this correction. A new Quality run on the final PR commit is
  required; PR #1 was not merged.
- Quality CI run `39846669544` on `c287196cc2961c84c7b180834f3dc7b859c21e65`
  passed API and Desktop and passed the full frontend/unit suite and build, but
  exposed four ambiguous accessible-name locators in existing desktop/mobile
  browser journeys after UX-02 added overlapping labels. Those locators now
  target the intended project-summary region and exact fingerprint/readiness
  labels. The full isolated Playwright run passes 24/24 locally after the fix;
  a final Quality run on the updated PR head is required.

## Browser captures

Automated Playwright captures (not human visual certification):

- Planning: `desktop-planning.png`, `desktop-planning-light.png`,
  `mobile-planning.png`, `mobile-planning-light.png`.
- Readiness: `desktop-readiness.png`, `desktop-readiness-light.png`,
  `mobile-readiness.png`, `mobile-readiness-light.png`.
- Existing workflow captures also include desktop/mobile Workbench and Transfer
  under `docs/evidence/ux01/`; those UX-01 baselines were preserved.

## Review boundary and known limitations

Browser assertions establish automated interaction and responsive behavior,
not human-reviewed Figma parity. No component or screen is declared visually
certified. Figma page 19 shared UI and page 20 product patterns were inspected
for implementation context; synthetic records in Figma remain examples, not
product data.

The existing API does not provide evidence provenance event history, an
execution API for verification rules, or independently verified delivery
activity. The UI continues to distinguish reported, observed, verified, and
not-published states rather than implying unsupported capabilities. UX-02
remains pending external visual review and a successful Quality CI run on the
final PR commit.
