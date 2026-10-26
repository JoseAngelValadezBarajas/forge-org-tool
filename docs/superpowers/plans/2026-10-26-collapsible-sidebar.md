# Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an accessible, persistent desktop sidebar toggle that changes the existing 244px sidebar into an approximately 72px icon rail without changing routes or mobile navigation.

**Architecture:** Keep sidebar state in `ApplicationShell` and apply it to the existing shell grid through a `data-sidebar-collapsed` state class. Extend the internal `NavigationItem` and `WorkspaceSwitcher` contracts only as needed to render icon-first compact controls; preserve labels in the accessibility tree. Use the existing `@corefoundry-labs/forge-icons` package and CSS Modules; add no dependencies or packages.

**Tech Stack:** React 19, TypeScript, React Router, CSS Modules, Vitest/Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-collapsible-sidebar-design.md`

## Global Constraints

- Keep the current 244px expanded sidebar visually and functionally intact.
- Use a compact rail of approximately 72px when collapsed.
- Do not change mobile navigation or the existing project search/collapse behavior.
- Do not change route semantics, active-link behavior or workspace/project data.
- Use existing icons from `@corefoundry-labs/forge-icons`; do not create a new icon package.

## Review Focus

- A stored collapsed preference must restore on a fresh shell render; test local storage restoration in `App.test.tsx`.
- Icon-only links must retain accessible names and active-route semantics; test the collapsed navigation by role/name and `aria-current`.
- Workspace selection must remain operable while collapsed; test the compact workspace select retains its label and options.
- Toggling the project section and project search must retain their current behavior after collapse/expand; test the existing controls in the collapsed shell.
- The rail must not create document-level horizontal overflow at desktop widths; add an isolated Chromium shell journey.

### Task 1: Extend shell control contracts

**Files:**
- Modify: `apps/web/src/app/shell/components/NavigationItem/NavigationItem.tsx`
- Modify: `apps/web/src/app/shell/components/WorkspaceSwitcher/WorkspaceSwitcher.tsx`
- Modify: corresponding CSS Module files
- Test: `apps/web/src/app/shell/components/NavigationItem/NavigationItem.test.tsx`
- Test: add compact workspace assertions in `apps/web/src/app/App.test.tsx`

**Interfaces:**
- `NavigationItemProps.icon` changes from `string` to `ReactNode`, preserving the default bullet and existing callers.
- `WorkspaceSwitcherProps.compact?: boolean` adds an icon-first visual mode while retaining the native `Workspace` select and its `onChange` contract.

- [ ] Write a failing NavigationItem test proving a supplied SVG/React node renders while the link keeps its accessible label.
- [ ] Run the focused NavigationItem test and confirm it fails because the current icon contract only renders string content.
- [ ] Implement the `ReactNode` icon contract and compact workspace mode with existing icon exports and accessible labels.
- [ ] Run the focused shell component tests and confirm they pass.
- [ ] Commit: `refactor: support compact shell navigation controls`

### Task 2: Add persistent shell collapse state and icon rail

**Files:**
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/App.module.css`
- Test: `apps/web/src/app/App.test.tsx`

**Interfaces:**
- `ApplicationShell` owns `sidebarCollapsed` using local-storage key `forge-sidebar-collapsed`.
- The sidebar toggle exposes `data-testid="sidebar-toggle"`, `aria-expanded`, `aria-controls="app-sidebar"`, and labels `Collapse sidebar` / `Expand sidebar`.
- The shell grid receives `data-sidebar-collapsed="true|false"`; expanded remains the default.

- [ ] Write failing App tests for the toggle, persisted state, accessible icon-only project links and preserved active-link semantics.
- [ ] Run those tests and confirm the failure is the missing toggle/state/compact markup.
- [ ] Add the lazy state initialization, persistence effect, toggle button, existing icon exports, and state attribute without changing route logic.
- [ ] Add CSS for `244px` expanded and `72px` collapsed grid columns, hide labels visually but not accessibly, keep focus/hover/active states, and keep the content column at `min-width: 0`.
- [ ] Run focused App tests and confirm they pass.
- [ ] Commit: `feat: add collapsible desktop sidebar`

### Task 3: Verify desktop behavior and package the Windows artifact

**Files:**
- Create or modify: `apps/web/src/app/AppShell.spec.ts` or the existing shell Playwright spec selected by repository conventions
- Modify: no production files unless Task 3 exposes a verified regression

**Interfaces:**
- Desktop shell behavior is verified at the existing Chromium desktop viewport and a compact desktop viewport near `1196px`.

- [ ] Add a Playwright regression that toggles the sidebar, checks expanded/collapsed widths, checks accessible labels, verifies the active project link remains reachable, and asserts `document.documentElement.scrollWidth <= innerWidth`.
- [ ] Run the isolated Chromium shell test and confirm it passes.
- [ ] Run frontend format check, lint, typecheck and the full frontend unit suite.
- [ ] Run `npm run build` so the generated web bundle contains the sidebar change.
- [ ] Run `npm run desktop:build:nsis` with the Cargo bin directory available on `PATH`.
- [ ] Run the installed smoke against the exact generated installer; if the native picker automation is flaky, report that limitation without claiming a full smoke pass.
- [ ] Record the installer path, SHA256, commit and verification results.

## Final Verification

Run:

```powershell
npm run format:check:web
npm run lint:frontend
npm run typecheck --workspace=@forge-org/web
npm run test --workspace=@forge-org/web -- --run
npm run build
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
npm run desktop:build:nsis
```

The final report must distinguish source/test verification from installed GUI smoke verification and must not include `build/` in commits.
