# Collapsible Sidebar Design

## Intent

Allow the desktop application sidebar to collapse into a compact icon rail while
preserving the current expanded layout and all existing navigation behavior.

## Goals

- Keep the current 244px expanded sidebar visually and functionally intact.
- Add an explicit accessible toggle for expanded and collapsed states.
- Use a compact rail of approximately 72px when collapsed.
- Replace navigation text with meaningful icons in the collapsed state.
- Keep icon-only controls keyboard accessible with `aria-label`, focus styles and
  native tooltip text.
- Persist the user's preference in local storage and restore it on startup.
- Keep the main content column responsive when the rail changes width.

## Non-goals

- Do not change mobile navigation or the existing project search/collapse behavior.
- Do not redesign the expanded sidebar hierarchy.
- Do not add a new icon package or change the existing icon contract.
- Do not change route semantics, active-link behavior or workspace/project data.

## Approaches considered

1. A persistent explicit toggle (selected): changes the shell grid between the
   existing expanded column and a compact rail, with accessible icons and a
   stored preference. It is predictable for keyboard and desktop users and does
   not introduce hover-driven navigation changes.
2. A hover-open rail: reduces the permanent width but can open accidentally and
   is less reliable for keyboard and pointer users.
3. Separate breakpoint-specific sidebar markup: would duplicate navigation
   structure and increase the risk of inconsistent active states.

## Design decisions

- The sidebar state belongs to the application shell, not to individual routes.
- The state key is namespaced as `forge-sidebar-collapsed` and stores a boolean
  string value.
- The toggle remains visible in both states and exposes `Collapse sidebar` or
  `Expand sidebar` as its accessible name.
- Expanded labels remain rendered for screen readers; collapsed visual labels
  are hidden only through the compact layout styles.
- Workspace switching, project search, project expansion and active route
  highlighting remain available without changing their current behavior.
- The project section controls use their existing icons; the workspace overview
  and project links receive stable semantic icons from `@corefoundry-labs/forge-icons`.

## Verification

- Add shell tests for toggle state, persisted preference, accessible names and
  preservation of active navigation.
- Add desktop Playwright coverage for expanded and collapsed widths and the
  absence of document-level horizontal overflow.
- Run frontend unit tests, lint, typecheck, production build and the existing
  desktop smoke/build checks as applicable.
