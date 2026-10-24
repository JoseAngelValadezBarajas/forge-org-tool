# Public UI Packages Design

## Intent

Separate the reusable visual packages from the FORGE application repository so
they can be consumed as versioned npm dependencies. Keep
`@forge-org/api-client` local and private in the FORGE repository because it is
application-specific and contains the generated backend contract boundary.

## Goals

- Publish `@corefoundry-labs/forge-tokens`, `@corefoundry-labs/forge-icons`, and `@corefoundry-labs/forge-ui` from a
  separate public GitHub repository.
- Preserve package APIs, CSS exports, React peer dependency behavior, and the
  current build/test coverage.
- Make `apps/web` consume published package artifacts rather than source paths.
- Keep `@forge-org/api-client` in `packages/api-client` as a local workspace.
- Provide reproducible package-repository CI for build, test, pack, and publish.

## Non-goals

- Do not publish `@forge-org/api-client` or its generated types.
- Do not redesign components, alter Figma variables, or change feature behavior.
- Do not introduce a new package manager, monorepo orchestrator, or speculative
  testing package.

## Constraints

- The public package repository is `JoseAngelValadezBarajas/forge-org-packages`.
- npm uses the `@corefoundry-labs` scope and `https://registry.npmjs.org`.
- Package releases use independent SemVer versions and are published only by
  an explicit tag/release workflow.
- The application repository keeps the API client workspace and its existing
  OpenAPI generation/checks.

## Approaches considered

1. Keep all packages in FORGE and publish from the application repository. This
   minimizes file movement but does not provide the requested separate package
   repository.
2. Use a Git submodule for the visual packages. This separates source history
   but adds checkout and CI coupling without improving npm consumption.
3. Extract the three visual packages into a dedicated public repository and
   consume published artifacts from FORGE. This is selected because it gives
   real external-consumer validation and clean ownership boundaries.

## Design

The new package repository contains the existing `tokens`, `icons`, and `ui`
package directories, their focused tests, build scripts, shared package CI,
and package documentation. Its workspace builds in dependency order:
tokens, icons, then ui. FORGE retains only `packages/api-client` as a workspace
package and references fixed published versions of the visual packages.

The application consumes public npm packages without a registry token. The
package repository publishes through npm Trusted Publishing with GitHub Actions
OIDC, so no long-lived publish credential is stored in GitHub.

## Success criteria

- The package repository has three publishable, non-private package manifests,
  passing package-local tests and consumer pack tests.
- FORGE has no workspace or TypeScript source inclusion for the visual package
  source directories, while `@forge-org/api-client` remains local.
- FORGE typecheck, frontend tests, package contract checks, and production build
  pass using installed package artifacts.
- No package-publication workflow references or publishes `api-client`.
