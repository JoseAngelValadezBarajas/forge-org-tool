# Project Search Focus Treatment

## Intent

Refine the project search field in the sidebar so its focused state matches the dark reference more closely: a restrained orange focus treatment instead of a heavy orange border.

## Scope

- Keep the existing neutral border, surface, search icon, clear action, and input behavior.
- Use the existing focus token with a thin visible focus indicator and no layout shift.
- Preserve disabled behavior and keyboard accessibility.

## Non-goals

- Do not change project selection styling, sidebar spacing, search API, or the shared `SearchField` public API.
- Do not introduce new tokens or dependencies.

## Decision

Apply the treatment in `packages/ui/src/components/forms/SearchField/SearchField.module.css`: retain the base border and replace the heavier `outline` focus treatment with a one-pixel orange focus outline plus a subtle supporting shadow. Existing tests and frontend behavior remain the verification boundary.
