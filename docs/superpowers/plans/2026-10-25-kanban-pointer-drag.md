# Kanban Pointer Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Epic and Work Item cards draggable from any non-click movement point, including their titles, in Chromium and the Windows WebView2 host.

**Architecture:** Add a small planning-owned pointer drag hook that starts after a 6px movement threshold, preserves ordinary link clicks, resolves the destination from `data-kanban-status`, and calls the existing feature-owned status update callbacks. Keep the existing HTML5 drag handlers as a fallback and keep keyboard status controls unchanged.

**Tech Stack:** React 19, TypeScript, CSS Modules, Playwright, Vitest.

**Spec:** User-approved option 2: pointer-based drag from the whole card.

## Global Constraints

- No new dependency.
- Preserve existing PATCH contracts and read-only behavior.
- Preserve horizontal board scrolling and one vertical scroll area per column.
- Do not change unrelated feature behavior.

## Review Focus

- A click on a card title must still navigate without changing status.
- A pointer drag beginning on a title must move the card to the destination column.
- Pointer release outside a column must not update the API.
- Read-only cards must not initiate a pointer move.
- Existing HTML5, keyboard, unit, and browser journeys must remain green.

### Task 1: Pointer drag contract

**Files:**
- Create: `apps/web/src/features/planning/usePointerKanbanDrag.ts`
- Test: `apps/web/e2e/planning/planning-workflows.spec.ts`

- [ ] Add a Chromium regression that moves an Epic from the center of its card with `page.mouse`, then asserts the existing Epic PATCH and Ready-column visibility.
- [ ] Verify the regression fails before the hook exists because no PATCH is sent.
- [ ] Implement `usePointerKanbanDrag` with a 6px threshold, pointer move/up listeners, destination lookup through `[data-kanban-status]`, click preservation, and cleanup on cancel/unmount.
- [ ] Verify the focused Epic and Work Item browser journeys pass.

### Task 2: Shared column and consumer adoption

**Files:**
- Modify: `apps/web/src/features/planning/components/KanbanColumn/KanbanColumn.tsx`
- Modify: `apps/web/src/features/planning/PlanningPage.tsx`
- Modify: `apps/web/src/features/planning/EpicDetailPage.tsx`
- Modify: relevant planning CSS modules

- [ ] Add `data-kanban-status` to the visible column drop surfaces.
- [ ] Wire pointer start/status callbacks into Epic and Work Item cards while retaining current HTML5 handlers.
- [ ] Add dragging visual state without changing card dimensions or scroll ownership.
- [ ] Run frontend unit tests, typecheck, lint, format, build, and the full focused Chromium scope.

### Task 3: Final verification

- [ ] Run the full frontend test suite and focused Chromium journeys.
- [ ] Confirm only intended files are committed and no generated build artifacts are staged.
- [ ] Commit the pointer-drag change separately from the existing scroll fix.
