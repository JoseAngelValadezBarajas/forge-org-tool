# Reconstruction verification

This record covers the ORG-001 vertical slice. It does not certify Figma
visual parity, desktop packaging, or the remaining ORG capabilities.

Implementation commits: `6eca0da` (ORG-001) and `443cb0d` (ORG-002).

## Automated verification

- Frontend `npm test`: architecture boundaries, token check, typecheck,
  architecture tests 5/5, and Vitest 9/9.
- API Ruff and strict mypy: passed.
- API pytest: 3/3 passed; one upstream Starlette/httpx deprecation warning.
- OpenAPI export check: passed.
- Production build: passed; `/__components` is absent from `apps/web/dist`.
- Isolated Chromium: 4/4 passed across desktop/mobile. Playwright starts its
  own Vite and API processes with `reuseExistingServer: false`; occupied ports
  fail in controlled isolation rather than attaching to an unknown process.

## Retained browser evidence

- Organization: [desktop](../m1/desktop-organization.png).
- Component Host dark/light: [desktop dark](../m1/desktop-component-host-dark.png),
  [desktop light](../m1/desktop-component-host.png), [mobile dark](../m1/mobile-component-host-dark.png),
  and [mobile light](../m1/mobile-gallery-light.png).

## Human review boundary

Screenshots demonstrate runtime behavior and responsive coverage. They do not
mark components as visually certified. The parity register remains
`IMPLEMENTED_NOT_REVIEWED`; Button's 40px implementation height versus the
36/38px Figma reference, StatusChip Info/Reported naming, Card Elevated,
SectionHeader counter composition, and the OrganizationEmptyState product
reference remain explicit review items.

## Scope truth

ORG-001 is verified for workspace/project persistence, selection, search,
create, archive, restore, duplicate protection, and cross-workspace isolation.
ORG-002 has API and frontend implementation tests for epic/feature creation and
manual overview grouping, but remains `IMPLEMENTED_NOT_REVIEWED` until its
remaining hierarchy interactions and browser evidence are complete. ORG-003
through ORG-009 remain not started. No legacy code/assets, private
bundles, real data migration, or desktop packaging were introduced.
