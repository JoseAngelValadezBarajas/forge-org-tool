# Component parity register

## Canonical inventory and provenance (Task 1)

[design-system-parity.json](design-system-parity.json) is the canonical inventory:
**100 rows: 37 core families, 35 individual icon masters, 28 product patterns**.
Figma file `r10szKLgiIPVi2NBmbjTpm`, page 19 (`173:2`), owns core
contracts/icons; page 20 (`229:2`) owns feature patterns. All 100 exact brief
IDs were located in read-only page metadata on 2026-10-20.

The first audit baseline was `3c7bd9b6ef618236c0ee0a1055d937032d771e4a`;
the integrated implementation snapshot is `67d15095cabd1b22958f931e971925ee45d44d05`.
Since then, all 37 Core UI families have been organized into self-contained
directories, the reusable icon package has been added, and the Component Host
has real previews for every core family and icon. The canonical JSON registry
contains current per-entry mappings and implementation status. All 100 visual
statuses remain `NOT_HUMAN_REVIEWED`.

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
Icons are implemented as independently authored SVG React components in
`packages/icons/src/icons/<Icon>/`, with package-level exports and tests for
all 35 masters. Figma references do not grant redistribution rights; the
registry records original authorship and no copied Figma geometry.

Every component exported from the `@forge-org/ui` entrypoint resolves to a
category/component directory with colocated implementation, CSS Module, tests,
and barrel. The architecture regression test enforces this mapping. Code-only
EmptyState, ErrorState, and LoadingState now own separate feedback directories
and styles instead of sharing the legacy `Shared.module.css`.

Product targets preserve shell and feature ownership. Decisions and Invariants
belong to readiness. ContextPackageCard's source name is Repositories /
ContextPackageCard, while its intended owner is the context feature.

ButtonSize `206:690` maps to Button's directory and is integrated into the
public `ButtonProps.size` API (`small | medium | large`); it is not a separate
component export. The host previews all three sizes. Figma describes these as
size reference specimens pending promotion, and its 100px specimen bounds are
not interpreted as approved production button heights. Button `173:27` has
36/38px default specimens, 40px Focused specimens and a current 40px
implementation minimum. The discrepancy is documented, not silently
normalized; human visual review remains pending.

Concrete design contexts inspected: Button `173:27`, ButtonSize `206:690`,
StatusChip `173:40`, Card `173:65`, MetricCard `173:66`,
SectionHeader master `177:183`, ContextPackageCard `229:426`,
VerificationSummary `229:515`, Settings `237:926`. The other variant
names/dimensions come from exact master metadata. No generated code or assets
were copied. StatePanel's related code does not implement its full Kind API.

On 2026-10-21, live Figma metadata for page 19 (`173:2`) and page 20 (`229:2`)
was re-read against the registry: all 100 canonical master IDs and every
mapped variant ID were present, and all recorded master/variant dimensions
matched the live metadata. Page 19 contains 35 unique icon names shown in Dark
and Light galleries (70 themed specimens). This is structural metadata
verification, not a human visual-parity review; all 100 visual statuses remain
`NOT_HUMAN_REVIEWED`.

### Existing code-only reusable compositions

These five entries are separate from the 100 Figma rows in
`codeOnlyComponents`. Page entry points and private gallery helpers are
excluded from the reusable inventory; tokens remain foundation evidence.

| Component              | Existing source                                                            | Relationship                                                     |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| EmptyState             | `packages/ui/src/components/feedback/EmptyState/EmptyState.tsx`            | Related to StatePanel.                                           |
| LoadingState           | `packages/ui/src/components/feedback/LoadingState/LoadingState.tsx`        | Related to StatePanel.                                           |
| ErrorState             | `packages/ui/src/components/feedback/ErrorState/ErrorState.tsx`            | Related to StatePanel.                                           |
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

| Component                                                                | Source/export                                              | Figma reference                                                                                                                  | Variants and states                                                                                                                                                                        | Tests                                               | Screenshot                                                                                                                                                        | Review                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Semantic tokens                                                          | `packages/tokens`                                          | Page 02: Foundations and Tokens                                                                                                  | light, dark                                                                                                                                                                                | host render and theme interaction                   | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Button                                                                   | `packages/ui`, public barrel                               | `173:27` Actions / Button                                                                                                        | Supported: primary, secondary, ghost, danger; hover, pressed, focus-visible, disabled and loading. Outstanding: Figma's 36/38px size variants; implementation remains 40px minimum height. | focused public-contract test                        | [Figma](../evidence/m1/figma-button-173-27.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)          | `PARTIAL_NOT_REVIEWED`     |
| Card                                                                     | `packages/ui`, public barrel                               | `173:65` Surfaces / Card                                                                                                         | neutral `div` by default; typed semantic roots; Default and Elevated variants are implemented and previewed                                                                                | focused public-contract test                        | [Figma](../evidence/m1/figma-card-173-65.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)            | `IMPLEMENTED_NOT_REVIEWED` |
| Input                                                                    | `packages/ui`, public barrel                               | `173:2` Core UI Components                                                                                                       | native text-compatible input; default, focus-visible, disabled                                                                                                                             | organization and host render tests                  | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Select                                                                   | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native select; default, focus-visible, disabled and invalid/error treatment                                                                                                                | focused UI contract and host render tests           | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Textarea                                                                 | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native textarea; default, focus-visible, disabled and invalid/error treatment                                                                                                              | focused UI contract and host render tests           | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| Checkbox                                                                 | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | native checked, unchecked, indeterminate, disabled and focus-visible states                                                                                                                | focused UI contract and host render tests           | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| SearchField                                                              | `packages/ui`, public barrel                               | `181:234` Forms / SearchField                                                                                                    | composed search icon and input; Empty, With query (optional clear), Disabled; filtering/debounce remain feature-owned                                                                      | focused UI contract and host render tests           | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| FormField                                                                | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | label, hint, error                                                                                                                                                                         | focused UI contract and host render tests           | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| MetricCard, Badge, Alert, EmptyState, LoadingState, ErrorState, Progress | `packages/ui`, public barrel                               | Page 19 shared UI contract                                                                                                       | Badge supports Figma Neutral/Accent/Info; Alert supports Info/Warning/Error/Success and heading/message; Progress supports the labeled panel with count, bar, note and progress states     | focused UI contract and host render tests           | [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)                                                           | `IMPLEMENTED_NOT_REVIEWED` |
| StatusChip                                                               | `packages/ui`, public barrel                               | `173:40` Status / StatusChip                                                                                                     | Figma Neutral/Success/Warning/Danger/Info/Reported implemented; `Accent` remains an additional API tone, not a mapping for Info or Reported                                                | focused tone contract and host tests                | [Figma](../evidence/m1/figma-status-chip-173-40.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png)     | `IMPLEMENTED_NOT_REVIEWED` |
| SectionHeader                                                            | `packages/ui`, public barrel                               | `177:183` SectionHeader                                                                                                          | title, eyebrow, actions and counter composition are implemented and previewed                                                                                                              | focused public-contract and host tests              | [Figma](../evidence/m1/figma-section-header-178-191.png), [desktop](../evidence/m1/desktop-component-host.png), [mobile](../evidence/m1/mobile-gallery-light.png) | `IMPLEMENTED_NOT_REVIEWED` |
| OrganizationEmptyState                                                   | `apps/web/src/features/organization`, public feature index | closest product reference: Workspace Home `4:32`; this is a product screen, not a confirmed native empty-state master on page 20 | backend-free host fixture; real organization empty state is in `OrganizationPage`                                                                                                          | application shell and host tests                    | [Figma](../evidence/m1/figma-workspace-home-4-32.png), [desktop](../evidence/m1/desktop-organization.png), [mobile](../evidence/m1/mobile-gallery-light.png)      | `IMPLEMENTED_NOT_REVIEWED` |
| Icon library                                                             | `@forge-org/icons`, public package barrel                  | Page 19 / 35 icon masters                                                                                                        | 35 independently authored SVG exports, currentColor, decorative hidden semantics or optional accessible title; no Figma asset copied                                                       | 35 icon suites, export map and packed consumer test | [desktop](../evidence/m1/desktop-component-host-dark.png), [mobile](../evidence/m1/mobile-component-host-dark.png)                                                | `IMPLEMENTED_NOT_REVIEWED` |

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
- StatusChip supports all six canonical tones, including distinct Info and
  Reported tones. Accent remains an extra API tone and is not relabeled as
  either canonical tone.
- Card's neutral root is a `div` by default; its typed semantic-root option and
  Elevated variant are present. The host previews Default and Elevated.
- SectionHeader includes a typed counter slot; the host previews it alongside
  the title, eyebrow and action slots.
- Figma `177:170` and `173:36` show Info text `#71a7e8` on `#1c2734`; Figma
  `173:38` shows Reported using muted text `#9ea5ad` on `#24272a`. The added
  light-theme backgrounds are semantic code tokens, not verified Figma modes.
- Figma Alert `173:70`/`173:76` establishes the title/message composition and
  info/error semantic colors. The implementation supports this composition
  while retaining children and the native `title` attribute for compatibility.
- The current core inventory status is 36 IMPLEMENTED and 1 PARTIAL. Button
  remains PARTIAL only for the documented 40px implementation height versus
  the Figma 36/38px specimens; global sizing has not been silently changed.
  All implemented components still have `NOT_HUMAN_REVIEWED` visual status.
- The page-20 product inventory now has 28 IMPLEMENTED and 0 PARTIAL entries.
  PageHeader supports Default, Breadcrumbs (`229:9`), and WithCommand via the
  shared Breadcrumbs primitive, and the host previews both default/action and
  breadcrumb compositions. All 28 host entries are available, but availability
  does not imply visual certification.
- ProjectPlanningHome exposes static Default, Empty, and Archived specimens;
  omitting its state retains the existing planning-page wrapper behavior.
  EvaluationSnapshot previews Preview, Saved, and Stale, while the live
  Readiness consumer only labels states supported by its returned data.
  RevisionHistory marks current and superseded entries; InvariantCard derives
  stale acknowledgement from revision numbers. These are product patterns,
  not evidence of backend verification. TrustDisclosure shows the Figma
  Default/Expanded static variants without inventing an interactive disclosure.
  All four remain `NOT_HUMAN_REVIEWED` for visual parity.
- ReportField now derives and visibly renders Figma `HasValue` and `Empty`
  states, omits a blank value row, and preserves its reported/no-assumed-proof
  disclosure. The canonical 9px footnote is mapped to the existing semantic
  secondary-text token; review that visual difference in the external pass.
- NavigationItem previews Default, Selected, and Disabled. Disabled is a
  non-link with `aria-disabled` and no tab stop, so it cannot navigate.
- DependencyGroup exposes Blocked, Clear, and Archived text states while
  preserving the existing relationship and consumer-owned action slot. Its
  legacy `archived` prop remains a backward-compatible override. PlanningPage
  marks the relation Clear only when its blocker is done; otherwise it remains
  Blocked.
- ProvenanceNotice exposes Reported, Observed, and Unknown, preserving the
  existing Reported copy and preventing an observation or unknown source from
  implying verification. The Observed/Unknown descriptions are more explicit
  than the shared Figma description; human visual review remains pending.
- MultiSelect now supports the canonical checkbox-list fieldset and
  Some-selected/None-available states while preserving its prior native
  multiple-select API. The option inventory remains feature-owned.
- FilePicker now renders Empty, Selected and Error panel states around a
  keyboard-accessible native file input. It intentionally does not implement
  drag-and-drop: Figma marks that affordance illustrative unless a feature
  provides it. File limits, accepted types and error copy remain feature-owned.
- Checkbox indeterminate, Select/Textarea invalid styling, FormField
  required/disabled composition, FormActions saving/read-only, MenuItem
  selected, Progress panel, Skeleton List and RecordRow read-only states are
  implemented and covered by focused tests.
- All 37 core registry rows now point to colocated implementation, stylesheet
  and test paths; all have an AVAILABLE Component Host entry. AVAILABLE means a
  real preview renders, not that every Figma state is demonstrated or visually
  certified.
- `4:32` is retained as the closest matching product empty-state screen. No
  exact native OrganizationEmptyState master on page 20 was confirmed.

The retained Figma captures document the reviewed references only. They do not
change the review status to `PASS`; human parity certification remains a
separate decision requiring side-by-side review of the Chromium evidence.

The ORG-006 delivery implementation does not change these visual review
statuses; its browser evidence is behavior evidence, not Figma certification.

## Product patterns outside the canonical libraries

The read-only screen audit and proposed future masters, with concrete source
node IDs and intended feature ownership, are tracked in
[proposed-pattern-masters.md](proposed-pattern-masters.md). Proposals are not
approved Figma masters and are not counted as implemented page-20 components.
