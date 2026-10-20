# Component parity register

The Component Host at `/__components` is development-only and renders the
actual public React exports. This register tracks implementation and review
separately. Automated tests do not produce visual `PASS` status.

Review states: `NOT_IMPLEMENTED`, `IMPLEMENTED_NOT_REVIEWED`, `PASS`,
`NEEDS_CHANGES`, `BLOCKED`.

| Component | Source/export | Figma reference | Variants and states | Tests | Screenshot | Review |
| --- | --- | --- | --- | --- | --- | --- |
| Semantic tokens | `packages/tokens` | Page 02: Foundations and Tokens | light, dark | host render and theme interaction | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Button | `packages/ui`, public barrel | `173:27` Button component set | current API: primary, secondary, ghost, danger; default, hover, active, focus-visible, disabled, loading | focused public-contract test | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Card | `packages/ui`, public barrel | `173:2` Core UI Components | default `div`; typed `section`, `article`, `aside`; Elevated variant outstanding | focused public-contract test | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Input | `packages/ui`, public barrel | `173:2` Core UI Components | native text-compatible input; default, focus-visible, disabled | organization and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| StatusChip | `packages/ui`, public barrel | `173:2` Core UI Components | current API: neutral, accent, success, warning, danger; Figma Info and Reported names outstanding | host and application tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| SectionHeader | `packages/ui`, public barrel | `173:2` Core UI Components | eyebrow, action slot; counter composition outstanding | host and application tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| OrganizationEmptyState | `apps/web/src/features/organization`, public feature index | closest product reference: Workspace Home `4:32`; no confirmed exact native master on page 20 | backend-free host fixture; real organization empty state is in `OrganizationPage` | application shell and host tests | [desktop](../evidence/m1/desktop-organization.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Icon library | not implemented | `173:2` Core UI Components | planned | no implementation | none | `NOT_IMPLEMENTED` |

The Figma file is the visual reference; pages 19/20 and the supplied primary
component references are not a license to copy legacy code or assets. A
component moves to `PASS` only after a reviewer inspects the retained
Chromium screenshot, responsive behavior, token correspondence and relevant
accessibility behavior.

Theme evidence: [desktop dark](../evidence/m1/desktop-component-host-dark.png),
[desktop light](../evidence/m1/desktop-component-host.png), [mobile dark](../evidence/m1/mobile-component-host-dark.png),
and [mobile light](../evidence/m1/mobile-gallery-light.png).

## Focused audit notes

- Button now exposes semantic hover and pressed treatments while retaining
  focus-visible and disabled precedence. The current implementation uses a
  40px minimum height; the `173:27` reference shows 36/38px variants. This is
  recorded as a visual discrepancy, not silently changed globally.
- StatusChip `Accent` is the current API name. It is not being represented as
  Figma `Info` or `Reported`; those mappings require a future contract/design
  decision.
- Card's default neutral root is a `div`. The Figma Elevated variant is not
  implemented.
- SectionHeader has no counter composition in its public contract.
