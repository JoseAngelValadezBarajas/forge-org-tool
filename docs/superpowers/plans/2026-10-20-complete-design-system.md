# FORGE Design System Reconstruction Plan

> **For agentic workers:** Use the authorized native subagents for disjoint component domains. Steps use checkbox syntax for tracking.

**Goal:** Deliver a reusable `@forge-org/ui` and `@forge-org/icons` system that accounts for every Figma page 19 and 20 master, preserves current FORGE behavior, and exposes every implemented public component through `/__components`.

**Architecture:** Keep generic controls and content primitives in the UI package, icon assets in a tree-shakeable licensed/original icon package, and FORGE business compositions within their owning feature. Every public component gets a self-contained directory with its implementation, CSS Module, tests, and barrel; the package root remains the stable public compatibility facade. A generated/validated parity registry joins Figma master, owner, API, styles, tests, and host preview.

**Tech Stack:** React 19, TypeScript, CSS Modules, semantic tokens, Vitest/Testing Library, Vite/Playwright, npm workspaces, Figma MCP.

**Spec:** User-provided `pasted-text-1.txt`; Figma file `r10szKLgiIPVi2NBmbjTpm`, page 19 node `173:2`, page 20 node `229:2`.

## Global Constraints

- Account individually for all 37 generic UI families, 35 icon masters, and 28 product pattern masters.
- Figma page 19 owns generic contracts; page 20 patterns remain feature-owned.
- Reuse current API contracts and interactions; preserve backward-compatible exports and functional consumers.
- Do not redistribute third-party icons without rights; newly authored icon geometry is allowed and must be recorded as original.
- Do not present visual parity as human-certified without an independent human review.
- Do not merge PR #1, publish packages, archive original FORGE, or migrate real databases.

## Review Focus

- Native semantics and keyboard interactions for composite controls; verify with behavior tests and keyboard tests.
- Stable package exports and CSS isolation after folder moves; verify packed external React/TypeScript consumer.
- Accurate Figma mapping and variants from inspected node metadata/screenshots; verify every inventory row has an owner, API, style, test, and host entry.
- Product pattern ownership and consumer behavior; verify existing feature journeys after adoption.
- Empty icon licensing/provenance and theme contrast; verify authored asset provenance, accessibility semantics, and dark/light render.

---

### Task 1: Canonical inventory and provenance

**Files:** Create `docs/design/design-system-parity.json`, update `docs/design/component-parity.md`.

- [x] Extract the 37 generic family list and 28 product master IDs, variants/states, and dimensions from page 19/20 metadata; Figma contexts now work when queried against concrete master nodes (for example `173:27` and `229:135`). The exact 35 icon node list still needs extraction.
- [ ] Record all 100 inventory rows with owner, public API, stylesheet, tests, Component Host, and review state; explicitly list code-only components.
- [ ] Add a validator that rejects missing/duplicate inventory rows and nonexistent source owners/host entries.

### Task 2: Generic UI components

**Files:** `packages/ui/src/components/**`, stable facade `packages/ui/src/index.ts` (coordinator-owned), focused tests.

- [ ] Move/implement every generic family under a category/component directory with colocated implementation, CSS Module, tests, and barrel.
- [ ] Preserve compatibility by re-exporting old public names through the package facade and preserving existing consumer contracts.
- [ ] Cover semantic, keyboard, controlled/uncontrolled, loading/disabled, validation, responsive, reduced-motion, and theme behavior where relevant.

### Task 3: Icons

**Files:** Create `packages/icons/**`, root npm workspace/package consumer checks, icon inventory rows.

- [ ] Verify all icon names and intended shapes from Figma metadata/context; author original currentColor SVG React components with typed size/title semantics.
- [ ] Add individual tree-shakeable exports, package build, accessibility tests, light/dark previews, and external packed-consumer coverage.

### Task 4: Feature-owned product patterns

**Files:** `apps/web/src/features/{organization,planning,readiness,repositories,context,workbench,delivery,transfer}/components/**` and owned feature consumers/tests.

- [ ] Implement the 28 canonical page 20 compositions in owning features, composing generic UI primitives and preserving current business behavior.
- [ ] Add focused state/interaction tests and adopt patterns in existing screens where their contracts fit.
- [ ] Document screen-only code patterns without inventing canonical masters.

### Task 5: Component Host and package validation

**Files:** `apps/web/src/app/component-gallery/**`, `packages/ui/scripts/**`, `tooling/scripts/package-consumer.test.mjs`.

- [ ] Render every public generic export and every icon family from the actual package exports with variants, states, keyboard notes, Figma references, implementation status, and responsive/light/dark previews.
- [ ] Validate packed UI and icon packages in an isolated React + TypeScript + bundler consumer; assert CSS Modules do not alter generic consumer classes and no application-only dependency is required.
- [ ] Keep screenshots automated evidence; record visual review as pending until independently reviewed.

### Task 6: Integrated verification and independent review

- [ ] Run format/lint/typecheck, architecture checks, package builds, focused accessibility tests, full frontend tests, isolated Playwright, production route exclusion, and GitHub Quality CI.
- [ ] Ask an independent reviewer subagent to inspect the integrated source, inventory completeness, package isolation, feature behavior, and evidence; resolve findings.
- [ ] Record exact commits, CI run, screenshot paths, inventory counts, and unresolved human visual review items.
