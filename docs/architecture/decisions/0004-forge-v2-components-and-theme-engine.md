# ADR-0004: Forge V2 components and Theme Engine V2

**Decision: accepted, 2026-11-06.** The web app consumes `@corefoundry-labs/forge-ui`, `forge-tokens` and `forge-icons` at exact version `1.1.0` and uses the V2 components and Theme Engine V2 everywhere a V2 equivalent exists. This supersedes the V1-only wording of ADR-0002 for those components; ownership boundaries in ADR-0002 are unchanged.

## What changed

- **Theme**: `app/theme.tsx` generates the active theme with `createTheme({ ...presets.forge, mode })` from `forge-tokens/theme-v2`. `App.tsx` renders the shell inside `ThemeScope`, and `applyTheme` also sets the roles on `<html>` so top-layer UI inherits them. Modes are Dark, Light, System and High contrast; high contrast is a V2 mode, so V1 tokens (`data-theme`) stay in the dark family while it is active.
- **Components**: Button, Card, Input, Select, Checkbox, Badge/StatusChip, Dialog, Tabs, Alert and the loading/error states are `ButtonV2`, `CardV2`, `TextInputV2`, `SelectV2`, `CheckboxV2`, `BadgeV2`, `DialogV2`, `TabsV2`, `AlertV2` and `FeedbackStateV2`. The hand-written storage and workspace menus are `DropdownMenuV2`; the sidebar toggle uses `TooltipV2` and the new `PanelLeft`/`PanelRight` icons.
- **Still V1** (no V2 equivalent in 1.1.0): `FormField`, `Textarea`, `SearchField`, `SectionHeader`, `Breadcrumbs`, `MenuItem`, `StepperStep`.

## Rules

1. `tooling/checks/forge-v2-usage.test.mjs` fails if the app imports a V1 component that has a V2 equivalent (the Component Host under `app/component-gallery` is excluded) or if the theme stops going through Theme Engine V2.
2. Two token systems coexist: V1 `--forge-*` for remaining V1 components and app CSS, and V2 `--cf-v2-*` roles for V2 components. New CSS should prefer the V2 roles; do not depend on V2 component tokens (only the semantic roles are public).
3. V2 overlays need the Popover API (Chrome/Edge 114, Safari 17, Firefox 125). Vitest runs in jsdom, so `src/test/setup.ts` models `showPopover`/`hidePopover` and `<dialog>.showModal`.

## Consequences

- Menu items are plain `menuitem`s; the active workspace/provider is exposed as an "(active)" suffix in the accessible name instead of `aria-checked`.
- Visual parity with Figma is not claimed (AGENTS.md rule 2); the migration is reviewed by Chromium screenshots.
