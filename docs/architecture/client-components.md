# Frontend organization and reusable-component contract

## Exact directory responsibility

| Directory                         | Owns                                                                               | Must never own                       |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| `packages/tokens/`                | Semantic palette, type scale, spacing, radii, generated CSS                        | Product state, components            |
| `packages/ui/src/primitives/`     | Accessible Button, IconButton, Field, Input, Card, Badge, Tabs etc.                | API calls, business statuses         |
| `packages/ui/src/components/`     | Domain-independent compositions: MetricCard, EmptyState, SectionHeader, StatusChip | Feature route logic, domain entities |
| `apps/web/src/app/`               | Routing, AppShell, providers, navigation integration, platform adapters            | A second button library              |
| `apps/web/src/features/<domain>/` | Routes, hooks, `components/`, `model/`, `api/`, styles; domain-to-tone mapping     | Shared primitives                    |
| `packages/api-client/`            | Typed HTTP facade, transport adapters and future generated OpenAPI models          | UI and business transformations      |

**Import rules**: web features may import `@forge-org/ui`, `@forge-org/api-client` and `@forge-org/tokens`; shared UI may import React and tokens, but not app, features or api-client. Feature imports across capabilities must use `index.ts` public exports. No new `apps/web/src/shared/ui` or feature-local copies of generic primitives.

## Component API conventions

- One canonical primitive with explicit typed props, styles scoped to its package, semantic tokens only, native HTML attributes and ref forwarding when useful.
- `StatusChip` should receive `tone` and `children`; a Planning status such as `in_progress` is mapped to a display label and tone inside `features/planning`, never inside the generic UI component.
- Loading, error, empty and read-only have distinct behavior. A visual success style is not proof of CI or deployment.
- Package barrel `@forge-org/ui` is the supported import. Do not deep import internal files.
- Test props, focus order, keyboard, input labels, reduced motion, long text, 1440×900 and 390×844, Dark and Light.
- Figma page 19 -> primitives/components. Figma page 20 -> feature-owned components, not an excuse to move business UI into packages/ui.

## Tokens and reconciliation

`packages/tokens/tokens.json` is the versioned executable catalog. `tooling/scripts/generate-tokens.mjs` emits its CSS, and CI verifies it is in sync. The initial palette is **provisional**. The older Figma/React drift register identifies 23 differences. Resolve each through a reviewed ADR before claiming parity or changing global Figma variables.

## Examples

`OrganizationEmptyState` below `features/organization/components` composes `Card`, `Button` and `SectionHeader` from `@forge-org/ui` while owning its copy and behaviors. It may not define its own `.button` or duplicate a shared `Card` implementation.
