# FORGE Architecture Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the existing FORGE monorepo independently reusable, capability-oriented, accessible, and verifiably maintainable without changing product semantics or safety boundaries.

**Architecture:** Keep the existing app/package dependency direction, but make package outputs distributable, move generic UI contracts into `@forge-org/ui`, derive/validate API types from the backend contract, and split backend HTTP/persistence by capability. Product composition remains feature-owned.

**Tech Stack:** npm workspaces, TypeScript/React/Vite, FastAPI/Pydantic/SQLite, Vitest/Playwright, Ruff/mypy, Rust/Tauri.

**Spec:** `C:\Users\josea\.codex\attachments\8ac2370f-93e5-47c2-bc2d-8594df55381a\pasted-text-1.txt`

## Global Constraints

- Preserve ORG-001 through ORG-009 behavior and exact public HTTP/OpenAPI contracts.
- Do not merge PR #1, publish packages, archive original FORGE, migrate real databases, or change real user data.
- Do not claim human Figma certification; record automated evidence separately from visual review.
- No empty/speculative packages; `icons` and `testing` require real consumers.
- Preserve desktop security boundaries and existing operator changes.

## Review Focus

- Packed artifacts must work outside npm workspace resolution: add an isolated consumer test covering types, runtime, CSS, and theme.
- Every consumed `--forge-*` token must be emitted: add a token-reference verifier.
- Public UI components must preserve semantics, keyboard behavior, refs, and accessible relationships: add focused contract tests.
- Backend extraction must preserve route order, status codes, fingerprints, transactions, and migrations: characterize before moving code.
- Existing dirty files and generated evidence must remain attributable: integrate only owned paths.

### Wave A: Package contracts and design system

- [ ] Audit and implement independent package builds, export maps, declarations, CSS delivery, and packed consumer verification.
- [ ] Reconcile emitted semantic tokens and fix accessible shared component defects with tests.

### Wave B: Shared UI, API, and feature boundaries

- [ ] Organize public UI components by responsibility and refactor all applicable consumers.
- [ ] Complete API client capability modules and OpenAPI-derived type validation.
- [ ] Extract feature hooks/components without changing behavior.

### Wave C: Backend boundaries

- [ ] Split API routers by bounded capability and persistence by connection, migrations, repository ports, and cohesive stores.
- [ ] Preserve characterization tests, OpenAPI, transactions, fingerprints, and migration upgrades.

### Wave D: Integration and review

- [ ] Add architecture/cycle/export/token checks and developer documentation.
- [ ] Run frontend, backend, package consumer, Playwright, desktop, and CI verification.
- [ ] Use an independent read-only reviewer and resolve substantive findings.
