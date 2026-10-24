# Public UI Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (already selected by the user) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract and publish the three reusable visual packages while keeping `@forge-org/api-client` local to FORGE.

**Architecture:** Create `C:\Dev\forge-org-packages` as the standalone package repository containing `tokens`, `icons`, and `ui`. Publish those packages to the `corefoundry-labs` npm scope through Trusted Publishing, then update FORGE to consume fixed package versions while retaining `packages/api-client` as its only local package workspace.

**Tech Stack:** Node.js 24, npm 11 workspaces, TypeScript, Vitest, GitHub Actions, npm registry.

**Spec:** `docs/superpowers/specs/2026-10-24-public-ui-packages-design.md`

## Global Constraints

- Never publish `@forge-org/api-client`.
- Preserve existing public exports, CSS subpath exports, tests, and consumer behavior.
- Use fixed SemVer package versions in FORGE; do not use `*` for published dependencies.
- Do not change feature UI, Figma variables, API contracts, or backend behavior.
- Do not overwrite an existing GitHub repository or delete user data.

## Review Focus

- Package repository can build and pack each package in dependency order.
- `@corefoundry-labs/forge-ui` resolves `tokens` and `icons` from package artifacts rather than workspace source aliases.
- FORGE still resolves `@forge-org/api-client` locally after visual workspaces are removed.
- CI publishes only the three allow-listed package names to npm.
- A clean external consumer can install the three visual packages and compile representative React/CSS imports.

### Task 1: Add failing boundary and package-publication tests

**Files:**
- Create: `tooling/scripts/public-package-boundary.test.mjs`
- Create: `tooling/scripts/public-package-boundary.mjs`
- Modify: `package.json`

- [ ] Write tests asserting the public allow-list is exactly `tokens`, `icons`, `ui`, and that `api-client` remains local/private.
- [ ] Run the focused test and confirm it fails against the current four-workspace/public-package state.
- [ ] Implement the boundary checker and wire it into `test:architecture`.
- [ ] Run the focused test and confirm it passes.
- [ ] Commit `test: define public package boundary`.

### Task 2: Create the standalone package repository

**Files:**
- Create: `C:\Dev\forge-org-packages\package.json`, `package-lock.json`, `README.md`, `.npmrc.example`, `.gitignore`
- Create: `C:\Dev\forge-org-packages\packages\tokens/**`, `icons/**`, `ui/**`
- Create: `C:\Dev\forge-org-packages\.github\workflows\quality.yml`, `publish.yml`
- Create: `C:\Dev\forge-org-packages\tooling\scripts\publish-packages.mjs`

- [ ] Copy the existing visual package source, tests, scripts, and package metadata into the standalone repository.
- [ ] Make the three manifests publishable with repository metadata, public npm access, and non-private SemVer versions.
- [ ] Add package-repository scripts for build, test, pack, quality, and allow-listed publish.
- [ ] Add CI that installs, builds, tests, packs, and publishes only `@corefoundry-labs/forge-tokens`, `@corefoundry-labs/forge-icons`, and `@corefoundry-labs/forge-ui`.
- [ ] Run package-repository quality and pack tests locally.
- [ ] Commit `feat: create public forge ui packages repository`.

### Task 3: Convert FORGE to external visual package consumption

**Files:**
- Modify: `package.json`, `package-lock.json`, `apps/web/package.json`, `apps/web/tsconfig.json`
- Modify: `tooling/scripts/package-consumer.test.mjs`, workspace lifecycle checks, README/package docs
- Remove from FORGE: `packages/tokens/**`, `packages/icons/**`, `packages/ui/**`

- [ ] Add a failing test proving the app has no visual package source inclusion and keeps the local API-client workspace.
- [ ] Run it and confirm the expected failure before changing the workspace.
- [ ] Replace visual workspace dependencies with fixed published versions and retain `@forge-org/api-client` as a local workspace dependency.
- [ ] Remove visual source includes and update package-consumer checks to use packed/public package artifacts.
- [ ] Run install, typecheck, focused package-contract tests, and frontend tests.
- [ ] Commit `refactor: consume public forge ui packages`.

### Task 4: Publish and verify external consumption

**Files:**
- Modify: `C:\Dev\forge-org-packages\README.md`, release metadata, CI workflow as needed
- Modify: FORGE install/CI documentation and workflow configuration

- [ ] Create `JoseAngelValadezBarajas/forge-org-packages` only if it does not already exist.
- [ ] Push the standalone package repository without `api-client`.
- [ ] Publish the three packages with an explicit initial version.
- [ ] Configure FORGE to install public npm packages without a registry token.
- [ ] Run the clean consumer test, FORGE typecheck, architecture checks, frontend tests, production build, and relevant CI checks.
- [ ] Commit `ci: publish and consume forge ui packages` where repository-local changes remain.

### Task 5: Final verification and report

- [ ] Inspect both repositories for secrets, untracked generated credentials, and accidental `api-client` publication references.
- [ ] Run `git diff --check`, all relevant package and FORGE checks, and record exact results.
- [ ] Record package repository URL, versions, commits, and remaining operational requirements.
- [ ] Report `PACKAGES_READY_FOR_REVIEW` only if all fresh checks pass; otherwise report `PACKAGES_BLOCKED` with exact failures.
