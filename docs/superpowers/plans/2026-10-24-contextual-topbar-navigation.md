# Contextual Topbar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the existing contextual topbar location text into an accessible breadcrumb-style navigation without changing the sidebar.

**Architecture:** Keep the existing `getProjectContext` and shell layout. Add a small pure helper that derives workspace, project and current section breadcrumb items from the pathname; render prior levels as `Link` elements and the current level as a non-link with `aria-current="page"`.

**Tech Stack:** React, React Router, TypeScript, CSS Modules, Vitest Testing Library.

**Spec:** User-confirmed option 1: convert only the top contextual strip into navigable breadcrumb navigation; preserve the modified sidebar and update tests.

## Global Constraints

- Do not alter sidebar markup, routes, or project navigation behavior.
- Preserve the existing topbar dimensions, separators and visual tokens.
- Workspace navigation returns to `/`; project navigation returns to `/projects/{workspaceId}/{projectId}`.
- The final breadcrumb item is the current location and is not a link.

## Review Focus

- Project planning route renders navigable workspace/project levels and current `EPICS` state.
- Epic detail route renders the current `EPIC` state without linking to itself.
- Feature detail route renders `WORK ITEM` as the current state.
- Non-project routes do not render contextual breadcrumb navigation.
- Existing sidebar links remain present and unchanged.

### Task 1: Add failing topbar navigation tests

**Files:**
- Modify: `apps/web/src/app/App.test.tsx`

- [ ] Add assertions for links and current item on `/planning/w1/p1`.
- [ ] Add assertions for `/planning/w1/p1/epics/e1` and `/planning/w1/p1/features/f1`.
- [ ] Assert the sidebar still exposes its existing project navigation.
- [ ] Run the focused App tests and verify the new assertions fail because the topbar currently contains spans.

### Task 2: Implement contextual breadcrumb rendering

**Files:**
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/App.module.css` only if link styling needs to preserve the current appearance.

- [ ] Add a pure pathname-to-items helper with typed breadcrumb item data.
- [ ] Render workspace and project items as links; render the final item as `aria-current="page"`.
- [ ] Preserve existing labels, separators, `aria-label="Current location"`, and topbar dimensions.
- [ ] Keep the sidebar code untouched.

### Task 3: Verify and commit

- [ ] Run focused App tests and the full frontend test suite.
- [ ] Run TypeScript typecheck and formatting validation.
- [ ] Review the diff to confirm no sidebar or unrelated route changes.
- [ ] Commit with `feat(web): make contextual topbar navigable`.
