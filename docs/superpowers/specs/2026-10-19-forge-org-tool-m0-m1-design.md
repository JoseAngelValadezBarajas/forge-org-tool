# FORGE Org Tool M0/M1 Design

## Goal

Preserve the original FORGE repository and establish an independent, public, local-first foundation for FORGE Org Tool without importing legacy history or real data.

## Decisions

- Product focus is software-work organization first; Organization and Planning are future bounded contexts, not M1 CRUD.
- English is used for source, UI copy, contracts, documentation, specifications, and tests; strings remain replaceable for future localization.
- M0 creates an external verified Git recovery artifact and records the current legacy baseline.
- M1 is a clean npm/uv monorepo bootstrap with a FastAPI health endpoint, React shell, real shared UI gallery, executable boundaries, and reproducible locks.
- The Figma file is visual intent. Page 19 informs reusable UI, page 20 informs feature-owned patterns, and the 23 token differences remain unresolved until explicit reconciliation and browser evidence.
- Desktop/Tauri is reserved. No Cargo.lock or desktop availability is claimed in M1.
- Real-data migration is outside M0/M1 and requires a later local-only specification with backup, dry-run, rollback, and integrity checks.

## Data flow

The browser shell composes `packages/ui`, tokens, and the transport boundary. The M1 API exposes only `/api/v1/health`; no durable product state is created. Future modules will point API adapters to application use cases, domain rules will remain framework-independent, and infrastructure will own persistence.

## Safety and publication gates

The legacy repository is never modified or archived by M0/M1. The new repository is published only after lockfiles, checks, secret/data audit, clean independent Git history, and human staged-file review. If GitHub publication or CI verification fails, the result is blocked with the exact observed error.

## Verification

Acceptance is defined in `docs/specs/M0-preservation/` and `docs/specs/M1-foundation/`. Implementation follows SDD/TDD where meaningful; generated/configuration work uses static validation and smoke checks when an artificial RED phase would add no signal.
