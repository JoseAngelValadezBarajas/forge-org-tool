# Remember Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit Supabase “Remember this session” option without changing the existing provider boundary or database contracts.

**Architecture:** `@forge-org/api-client` owns the typed preference and chooses between `sessionStorage` and `localStorage` for the profile-bound session. React exposes the preference in Settings > Storage and passes it when configuring Supabase. The default remains non-persistent across a new WebView session.

**Tech Stack:** TypeScript, Node test runner, React, Vitest, existing WebView storage APIs.

**Spec:** `docs/superpowers/specs/2026-10-26-remember-session-design.md`

## Global Constraints

- Do not change SQLite, Supabase migrations, schema, RLS, or remote user data.
- Accept only the existing `sb_publishable_*` profile configuration.
- Never persist passwords, service-role keys, database passwords, or connection strings.
- Preserve same-profile restoration and changed-profile invalidation.
- Do not add a new native dependency or auth proxy.

## Review Focus

- Preference disabled: session is not restored from persistent storage after a new session; covered by the API-client storage test.
- Preference enabled: same-profile session is restored and refreshed; covered by the API-client reload test.
- Toggle from enabled to disabled: old persistent tokens are removed; covered by the API-client storage test.
- Sign-out/provider/project change: both storage layers cannot resurrect the old session; covered by API-client invalidation tests.
- Settings form: accessible checkbox is passed to configuration and remains understandable; covered by StorageSettings tests.

### Task 1: API-client session persistence mode

**Files:**
- Modify: `packages/api-client/src/storage.ts`
- Test: `packages/api-client/test/storage.test.mjs`

**Interfaces:**
- Produce `rememberSession?: boolean` on Supabase storage configuration and snapshots.
- Preserve `initializeStoredStorage()`, `configureStorage()`, `signInSupabase()`, and `signOutSupabase()` public behavior.

- [ ] Step 1: Add failing tests for disabled persistence, enabled reload restoration, preference toggling, and clearing both storage layers.
- [ ] Step 2: Run `npm run test:contract --workspace=@forge-org/api-client` and confirm the new tests fail for the missing persistence mode.
- [ ] Step 3: Implement the preference key, storage selection, snapshot/configuration field, and clear-both-layers behavior in `storage.ts`.
- [ ] Step 4: Run the focused API-client contract tests and confirm they pass.
- [ ] Step 5: Run TypeScript build for `@forge-org/api-client`.

### Task 2: Storage Settings control

**Files:**
- Modify: `apps/web/src/features/organization/StorageSettings.tsx`
- Test: `apps/web/src/features/organization/StorageSettings.test.tsx`

**Interfaces:**
- Consume the API-client `rememberSession` configuration field.
- Preserve current local/Supabase onboarding, explicit preflight, sign-out, and warning copy.

- [ ] Step 1: Add a failing UI test asserting an accessible unchecked “Remember this session” control and that its checked value is sent with Supabase configuration.
- [ ] Step 2: Run the focused Vitest test and confirm it fails because the control/configuration field is absent.
- [ ] Step 3: Add the controlled checkbox and explanatory security copy; pass its value to `configureStorage()`.
- [ ] Step 4: Run the focused UI test and confirm it passes.

### Task 3: Documentation and integration verification

**Files:**
- Modify: `docs/architecture/byoc-0.1.md`
- Modify: `docs/operations/byoc-supabase.md`
- Modify: `docs/architecture/byoc-0.2.md`

- [ ] Step 1: Document default session-only behavior, explicit persistent preference, logout/profile invalidation, and current WebView storage limitation.
- [ ] Step 2: Run API-client contract tests, frontend tests, lint, typecheck, and production build.
- [ ] Step 3: Run `git diff --check`, confirm no migration/SQLite files changed, and inspect the final diff.
- [ ] Step 4: Commit the focused implementation with a descriptive message.

## Verification Commands

```powershell
npm run test:contract --workspace=@forge-org/api-client
npm run test --workspace=@forge-org/web -- StorageSettings.test.tsx
npm run lint:frontend
npm run build
git diff --check
```
