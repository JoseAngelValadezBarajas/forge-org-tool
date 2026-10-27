# Storage provider menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the sidebar's `LOCAL FIRST · PRIVATE` label into an accessible menu for configuring and switching among configured storage providers.

**Architecture:** Keep provider state and persistence inside `@forge-org/api-client`; expose a small capability for discovering configured providers and activating one. The application shell renders the menu, listens for storage changes, and navigates to the existing `/settings/storage` route. Switching to Local changes the active request handler but preserves the configured Supabase profile/session for a reversible switch.

**Tech Stack:** TypeScript, React, React Router, CSS Modules, Node test runner, Vitest, existing `@corefoundry-labs/forge-icons` icons.

**Spec:** `docs/superpowers/specs/2026-10-26-storage-provider-menu-design.md`

## Global Constraints

- Local SQLite remains the default and is always listed.
- Supabase is listed only when a valid profile is configured locally.
- Selecting `Configure storage` navigates to `/settings/storage`.
- Switching providers never copies, merges, or deletes data.
- Firebase remains future work and is not added to the menu.
- The menu must remain keyboard accessible and usable in the collapsed sidebar.
- Do not add dependencies or introduce a second storage state/context.

## Review Focus

- A configured Supabase profile must remain discoverable after switching to Local; API-client storage tests cover this.
- A reload while Local is active must remain Local rather than implicitly activating Supabase; API-client tests cover the persisted active provider.
- Selecting Supabase without a configured profile must fail safely and leave Local active; API-client tests cover the negative path.
- The menu must expose `Configure storage`, a separator, both configured providers, and the active state; App tests cover the accessible structure.
- The collapsed sidebar must retain an accessible storage control and menu; App tests cover the collapsed rendering.

---

### Task 1: Make storage provider activation reversible

**Files:**
- Modify: `packages/api-client/src/storage.ts`
- Modify: `packages/api-client/src/index.ts`
- Test: `packages/api-client/test/storage.test.mjs`

**Interfaces:**
- Produces `getConfiguredStorageProviders(): StorageProvider[]`, returning `local` and optionally `supabase` when a valid persisted profile exists.
- Produces `switchStorageProvider(provider: StorageProvider): StorageSnapshot`, activating Local or the persisted Supabase profile; throws a controlled error when Supabase is not configured.
- Emits a browser-safe `forge:storage-changed` event after provider/session state changes so the shell can refresh without a new context.

- [x] **Step 1: Write failing storage contract tests**

Add tests for: configured Supabase remains listed after switching to Local; Local remains active after reload; switching back to Supabase restores the same profile/session; and switching to unconfigured Supabase throws without changing the active provider.

- [x] **Step 2: Run the API-client tests and verify RED**

Run `npm run test:contract --workspace=@forge-org/api-client`.
Expected: the new provider-discovery/switching tests fail because the public capability does not exist or Local clears the persisted profile.

- [x] **Step 3: Implement the minimal reversible storage capability**

Persist the active provider separately from the Supabase profile. Preserve the profile and persisted session when activating Local, while keeping the local request handler active. On Supabase activation, restore the persisted profile/session through the existing configuration path. Guard event dispatch for non-browser test/runtime environments.

- [x] **Step 4: Run the API-client tests and verify GREEN**

Run `npm run test:contract --workspace=@forge-org/api-client`.
Expected: all storage and Supabase contract tests pass.

- [x] **Step 5: Commit the cohesive client change**

```powershell
git add packages/api-client/src/storage.ts packages/api-client/src/index.ts packages/api-client/test/storage.test.mjs
git commit -m "feat: support reversible storage provider switching"
```

### Task 2: Add the accessible sidebar storage menu

**Files:**
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/App.module.css`
- Test: `apps/web/src/app/App.test.tsx`

**Interfaces:**
- Consumes `getStorageSnapshot`, `getConfiguredStorageProviders`, and `switchStorageProvider` from `@forge-org/api-client`.
- Uses `forge:storage-changed` to refresh the active provider and configured-provider list.
- The menu button has an accessible name, `aria-haspopup="menu"`, `aria-expanded`, and menu items for configuration and provider activation.

- [x] **Step 1: Write failing shell tests**

Add tests asserting the sidebar control opens a menu containing `Configure storage`, a separator, Local SQLite, and configured Supabase; selecting Configure navigates to `/settings/storage`; selecting a provider invokes activation; and the control remains accessible after collapsing the sidebar.

- [x] **Step 2: Run the focused shell tests and verify RED**

Run `npx vitest run src/app/App.test.tsx --reporter=verbose` from `apps/web`.
Expected: the new menu tests fail because the sidebar still renders static text.

- [x] **Step 3: Implement the minimal menu in the existing shell**

Replace the static label with a button/popover using existing icons and CSS Modules. Keep provider labels and active state in the menu, close the menu after navigation/activation, and preserve the existing collapsed-sidebar icon rail behavior through visually hidden text plus the control icon.

- [x] **Step 4: Run focused tests and verify GREEN**

Run `npx vitest run src/app/App.test.tsx --reporter=verbose` from `apps/web`.
Expected: all App shell tests pass with the new menu behavior.

- [x] **Step 5: Commit the shell change**

```powershell
git add apps/web/src/app/App.tsx apps/web/src/app/App.module.css apps/web/src/app/App.test.tsx
git commit -m "feat: add sidebar storage provider menu"
```

### Task 3: Integration verification

**Files:**
- Modify: `docs/superpowers/specs/2026-10-26-storage-provider-menu-design.md`
- Modify: `docs/superpowers/plans/2026-10-26-storage-provider-menu.md`

- [x] **Step 1: Run formatting and type checks**

Run `npx prettier --check` on changed files and `npm run typecheck --workspace=@forge-org/web`.

- [x] **Step 2: Run the full relevant suites**

Run `npm run test --workspace=@forge-org/web`, `npm run test:contract --workspace=@forge-org/api-client`, `npm run check:architecture`, and `npm run build`.

- [x] **Step 3: Review the final diff and status**

Run `git diff --check`, `git status --short`, and `git log -2 --oneline`. Confirm only intended source, tests, and design/plan documentation are committed; retain unrelated untracked build artifacts.

- [x] **Step 4: Commit verification documentation if needed**

Only commit documentation updates that record actual executed verification; do not claim external Supabase or visual certification from local tests.

## Executed verification

- `npm test`: PASS — architecture, design-system, token, OpenAPI, tooling, frontend, and package suites; 174 frontend tests passed with 8 skipped and 34 api-client contract tests passed.
- `npm run lint:frontend`: PASS.
- `npm run build`: PASS, including production Component Host exclusion.
- Focused RED runs were observed before implementation for both the API capability and sidebar menu.
- No real Supabase project or user data was accessed.
