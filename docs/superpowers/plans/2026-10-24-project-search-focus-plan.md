# Project Search Focus Treatment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the sidebar project search focus state visually lighter and closer to the approved reference.

**Architecture:** Keep the shared `SearchField` API and markup unchanged. Adjust only its CSS focus treatment so every existing consumer receives the same accessible visual refinement.

**Tech Stack:** React, TypeScript, CSS Modules, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-project-search-focus-design.md`

## Global Constraints

- Preserve the existing `SearchField` API and native searchbox semantics.
- Do not change project selection, layout, tokens, or dependencies.
- Do not weaken focus-visible or disabled behavior.

## Review Focus

- Keyboard focus: the search field must retain a visible focus indicator.
- Disabled search: disabled styling must remain unaffected.
- Clear action: an existing query must still expose and operate the clear button.

### Task 1: Refine shared SearchField focus styling

**Files:**
- Modify: `packages/ui/src/components/forms/SearchField/SearchField.module.css`
- Test: `packages/ui/src/components/forms/SearchField/SearchField.test.tsx`

**Interfaces:**
- Consumes: existing `SearchField` DOM and CSS module classes.
- Produces: the same public component API with the lighter focused appearance.

- [ ] **Step 1: Add or update focused-contract assertions**

Keep the existing tests for search semantics, clear behavior, and disabled state as the regression boundary; add only a DOM assertion if needed to pin the focused state without coupling to generated CSS-module names.

- [ ] **Step 2: Run the focused SearchField tests**

Run `npm test --workspace=@corefoundry-labs/forge-ui -- --run src/components/forms/SearchField/SearchField.test.tsx` and confirm the current behavior is green before the CSS-only change.

- [ ] **Step 3: Apply the CSS-only focus refinement**

Keep the base `border: 1px solid var(--forge-border)` and use a one-pixel `outline` with `var(--forge-focus-ring)` plus a subtle `box-shadow`; leave disabled and clear-action rules unchanged.

- [ ] **Step 4: Run focused and frontend verification**

Run the SearchField tests, the full web test suite, `npm run typecheck --workspace=@forge-org/web`, and `git diff --check`.

- [ ] **Step 5: Commit**

Commit the spec, plan, and implementation as `fix(ui): refine project search focus treatment`.
