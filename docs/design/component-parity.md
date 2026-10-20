# Component parity register

The Component Host at `/__components` is development-only and renders the
actual public React exports. This register tracks implementation and review
separately. Automated tests do not produce visual `PASS` status.

Review states: `NOT_IMPLEMENTED`, `IMPLEMENTED_NOT_REVIEWED`, `PASS`,
`NEEDS_CHANGES`, `BLOCKED`.

| Component | Source/export | Figma reference | Variants and states | Tests | Screenshot | Review |
| --- | --- | --- | --- | --- | --- | --- |
| Semantic tokens | `packages/tokens` | Page 02: Foundations and Tokens | light, dark | host render and theme interaction | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Button | `packages/ui`, public barrel | `173:2` Core UI Components | primary, secondary, ghost, danger; default, disabled, loading | M1 Vitest contract | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Card | `packages/ui`, public barrel | `173:2` Core UI Components | default | M1 Vitest contract | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| StatusChip | `packages/ui`, public barrel | `173:2` Core UI Components | neutral, accent, success, warning, danger | M1 Vitest contract | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| SectionHeader | `packages/ui`, public barrel | `173:2` Core UI Components | eyebrow, action slot | M1 Vitest contract | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| OrganizationEmptyState | `apps/web/src/features/organization`, public feature index | `229:2` Product Patterns | empty/not implemented | application shell tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| Icon library | not implemented | `173:2` Core UI Components | planned | no implementation | none | `NOT_IMPLEMENTED` |

The Figma file is the visual reference; pages 19/20 and the supplied primary
component references are not a license to copy legacy code or assets. A
component moves to `PASS` only after a reviewer inspects the retained
Chromium screenshot, responsive behavior, token correspondence and relevant
accessibility behavior.
