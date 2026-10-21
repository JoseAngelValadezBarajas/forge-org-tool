# Component parity register

## Canonical inventory and provenance (Task 1)

[design-system-parity.json](design-system-parity.json) is the canonical inventory:
**100 rows: 37 core families, 35 individual icon masters, 28 product patterns**.
Figma file `r10szKLgiIPVi2NBmbjTpm`, page 19 (`173:2`), owns core
contracts/icons; page 20 (`229:2`) owns feature patterns. All 100 exact brief
IDs were located in read-only page metadata on 2026-10-20.

The code snapshot is `3c7bd9b6ef618236c0ee0a1055d937032d771e4a`.
Coverage is 1 IMPLEMENTED, 40 PARTIAL and 59 NOT_IMPLEMENTED. MetricCard has
the existing label/value/detail contract. Partial rows identify missing
variants/composition or inline business behavior awaiting a named component.
These labels do not certify appearance or completion of directory migration.
All 100 visual statuses are NOT_HUMAN_REVIEWED.
There are 14 AVAILABLE canonical host fixtures and 86 PLANNED preview IDs.

### Registry schema

| Field                                          | Interpretation                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category`, `figmaNodeId`, `figmaName`         | Frozen brief identity. Categories are core, icon, product.                                                                                                    |
| `sourceName`, `source`                         | Exact Figma source name, file/page, bounds and review method. Brief aliases such as TextInput and Tab/Tabs retain their identity.                             |
| `owner`                                        | Concrete intended directory; existence is not implied.                                                                                                        |
| `component`                                    | Name, target file and current implementation paths.                                                                                                           |
| `publicApi`, `styles`, `tests`                 | Target and current mappings. Empty current arrays mean absent mappings. Current suite paths are behavior evidence locations, not complete variant tests.      |
| `componentHost`                                | Unique non-empty catalog ID, AVAILABLE or PLANNED, and current gallery source only for available fixtures. These are catalog IDs, not guaranteed DOM anchors. |
| `variants`                                     | Exact specimen node IDs, source names, width and height; a single master retains its own bounds.                                                              |
| `states`                                       | Exact State-axis values. Tone, Style, Kind and Size remain in variant names. Empty means no State axis enumerated.                                            |
| `implementationStatus`                         | IMPLEMENTED, PARTIAL or NOT_IMPLEMENTED, independent of human visual review.                                                                                  |
| `visualReviewStatus`                           | NOT_HUMAN_REVIEWED for every entry.                                                                                                                           |
| `implementationNotes`, `relatedImplementation` | Deviations and existing inline/related behavior; related code is not a completed named export.                                                                |

Core targets use `packages/ui/src/components/<category>/<Component>/`.
Icons target `packages/icons/src/icons/<Icon>/`; no icon package or geometry
is created here. Figma references do not grant redistribution rights. Future
geometry requires documented rights or original authorship.

Product targets preserve shell and feature ownership. Decisions and Invariants
belong to readiness. ContextPackageCard's source name is Repositories /
ContextPackageCard, while its intended owner is the context feature.

ButtonSize `206:690` maps to Button's directory and the intended
`ButtonProps.size` API, with `integration.implemented: false`. The prop is
absent, so its status is NOT_IMPLEMENTED; no separate ButtonSize export is
planned. Figma describes these as size reference specimens pending promotion.
Both metadata and context report Small/Medium/Large specimen heights of 100px.
Those bounds are not interpreted as approved production button heights.
Button `173:27` has 36/38px default specimens, 40px Focused specimens and a
current 40px implementation minimum.

Concrete design contexts inspected: Button `173:27`, ButtonSize `206:690`,
StatusChip `173:40`, Card `173:65`, MetricCard `173:66`,
SectionHeader master `177:183`, ContextPackageCard `229:426`,
VerificationSummary `229:515`, Settings `237:926`. The other variant
names/dimensions come from exact master metadata. No generated code or assets
were copied. StatePanel's related code does not implement its full Kind API.

### Existing code-only reusable compositions

These five entries are separate from the 100 Figma rows in
`codeOnlyComponents`. Page entry points and private gallery helpers are
excluded from the reusable inventory; tokens remain foundation evidence.

| Component              | Existing source                                                            | Relationship                                                     |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| EmptyState             | `packages/ui/src/components/EmptyState.tsx`                                | Related to StatePanel.                                           |
| LoadingState           | `packages/ui/src/components/LoadingState.tsx`                              | Related to StatePanel.                                           |
| ErrorState             | `packages/ui/src/components/ErrorState.tsx`                                | Related to StatePanel.                                           |
| OrganizationEmptyState | `apps/web/src/features/organization/components/OrganizationEmptyState.tsx` | Closest product screen `4:32`; exact page-20 master unconfirmed. |
| DeliverySummary        | `apps/web/src/features/delivery/DeliverySummary.tsx`                       | Count summary, not VerificationSummary or ReleaseGate.           |

Validate with `node tooling/scripts/validate-design-system-parity.mjs` and
`node --test tooling/scripts/validate-design-system-parity.test.mjs`.
The validator freezes exact IDs/names/categories, mappings, statuses, unique
preview IDs and ButtonSize integration without requiring future source files.

## Historical M1 evidence

The following M1 notes retain their behavior/screenshot evidence. Their legacy
review labels do not supersede the canonical NOT_HUMAN_REVIEWED statuses.
SectionHeader `178:191` below is a gallery instance; its canonical master is
`177:183`.

The Component Host at `/__components` is development-only and renders the
actual public React exports. This register tracks implementation and review
separately. Automated tests do not produce visual `PASS` status.

Review states: `NOT_IMPLEMENTED`, `IMPLEMENTED_NOT_REVIEWED`, `PASS`,
`NEEDS_CHANGES`, `BLOCKED`.

| Component                                                                | Source/export                                              | Figma reference                                                                                                                  | Variants and states                                                                                                                                                                                                                 | Tests                                     | Screenshot                                                                                                                                                        | Review                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Semantic tokens                                                          | `packages/tokens`                                          | Page 02: Foundations and Tokens                                                                                                  | light, dark                                                                                                                                                                                                                         | host render and theme interaction         | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Button                                                                   | `packages/ui`, public barrel                               | `173:27` Actions / Button                                                                                                        | API supports primary, secondary, ghost, danger; implementation covers default, hover, pressed, focus-visible, disabled, loading. Figma also contains explicit 36/38px size variants; current implementation is 40px minimum height. | focused public-contract test              | [Figma](../evidence/m1/figma-button-173-27.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)          | `IMPLEMENTED_NOT_REVIEWED` |
| Card                                                                     | `packages/ui`, public barrel                               | `173:65` Surfaces / Card                                                                                                         | default `div`; typed `section`, `article`, `aside`; Figma Default and Elevated are present, but Elevated is not implemented                                                                                                         | focused public-contract test              | [Figma](../evidence/m1/figma-card-173-65.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)            | `IMPLEMENTED_NOT_REVIEWED` |
| Input                                                                    | `packages/ui`, public barrel                               | `173:2` Core UI Components                                                                                                       | native text-compatible input; default, focus-visible, disabled                                                                                                                                                                      | organization and host render tests        | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Select                                                                   | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native select; default, focus-visible, disabled                                                                                                                                                                                     | focused UI contract and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Textarea                                                                 | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native textarea; default, focus-visible, disabled                                                                                                                                                                                   | focused UI contract and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Checkbox                                                                 | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native checkbox; default, focus-visible, disabled                                                                                                                                                                                   | focused UI contract and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| SearchField                                                              | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native search input; default, focus-visible, disabled                                                                                                                                                                               | focused UI contract and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| FormField                                                                | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | label, hint, error                                                                                                                                                                                                                  | focused UI contract and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| MetricCard, Badge, Alert, EmptyState, LoadingState, ErrorState, Progress | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | generic compositions used by host fixtures; no speculative product variants                                                                                                                                                         | focused UI contract and host render tests | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| StatusChip                                                               | `packages/ui`, public barrel                               | `173:40` Status / StatusChip                                                                                                     | current API: neutral, accent, success, warning, danger. Figma exposes Neutral, Success, Warning, Danger, Info, Reported; `Accent` is not a confirmed Figma mapping.                                                                 | host and application tests                | [Figma](../evidence/m1/figma-status-chip-173-40.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)     | `IMPLEMENTED_NOT_REVIEWED` |
| SectionHeader                                                            | `packages/ui`, public barrel                               | `178:191` SectionHeader                                                                                                          | current API: title, eyebrow, action slot. Figma includes a title-plus-counter composition; counter parity is outstanding.                                                                                                           | host and application tests                | [Figma](../evidence/m1/figma-section-header-178-191.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| OrganizationEmptyState                                                   | `apps/web/src/features/organization`, public feature index | closest product reference: Workspace Home `4:32`; this is a product screen, not a confirmed native empty-state master on page 20 | backend-free host fixture; real organization empty state is in `OrganizationPage`                                                                                                                                                   | application shell and host tests          | [Figma](../evidence/m1/figma-workspace-home-4-32.png), [desktop](../evidence/m1/desktop-organization.png), [mobile](../evidence/m1/mobile-gallery-light.png)      | `IMPLEMENTED_NOT_REVIEWED` |
| Icon library                                                             | not implemented                                            | `173:2` Core UI Components                                                                                                       | planned                                                                                                                                                                                                                             | no implementation                         | none                                                                                                                                                              | `NOT_IMPLEMENTED`          |

The Figma file is the visual reference; page 19 defines shared UI contracts and page 20 defines feature-owned product patterns. The supplied primary
component references are not a license to copy legacy code or assets. A
component moves to `PASS` only after a reviewer inspects the retained
Chromium screenshot, responsive behavior, token correspondence and relevant
accessibility behavior.

Theme evidence: [desktop dark](../evidence/m1/desktop-component-host-dark.png),
[desktop light](../evidence/m1/desktop-component-host.png), [mobile dark](../evidence/m1/mobile-component-host-dark.png),
and [mobile light](../evidence/m1/mobile-gallery-light.png).

## Focused audit notes

- Read-only Figma review on 2026-10-20 confirmed `173:27` contains explicit
  Default, Hover, Pressed, Focused, Disabled and Loading states for Primary,
  Secondary, Ghost and Danger. The implementation covers the supported state
  behavior; visual certification is intentionally not claimed.
- Button now exposes semantic hover and pressed treatments while retaining
  focus-visible and disabled precedence. The current implementation uses a
  40px minimum height; the `173:27` reference shows 36/38px variants. This is
  recorded as a visual discrepancy, not silently changed globally.
- StatusChip `Accent` is the current API name. It is not being represented as
  Figma `Info` or `Reported`; those mappings require a future contract/design
  decision.
- Read-only Figma review confirmed `173:40` names the two currently missing
  StatusChip concepts `Info` and `Reported`; the current `Accent` API is not
  silently relabeled.
- Card's default neutral root is a `div`. The Figma Elevated variant is not
  implemented.
- Read-only Figma review confirmed `178:191` includes a title-plus-counter
  composition. SectionHeader has no counter composition in its public contract.
- `4:32` is retained as the closest matching product empty-state screen. No
  exact native OrganizationEmptyState master on page 20 was confirmed.

The retained Figma captures document the reviewed references only. They do not
change the review status to `PASS`; human parity certification remains a
separate decision requiring side-by-side review of the Chromium evidence.

The ORG-006 delivery implementation does not change these visual review
statuses; its browser evidence is behavior evidence, not Figma certification.
