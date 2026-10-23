# Task 1 report — generated-contract Project API operations

## Result

Implemented workspace-scoped Project GET and PATCH operations on the existing `organizationApi` compatibility facade. `ProjectUpdate` aliases the generated OpenAPI schema type `Schema['ProjectUpdate']`. No generated files, backend code, endpoint contracts, or unrelated files were changed.

## Test-first RED evidence

Added the facade contract assertions before implementation and ran:

```text
npm run test --workspace=@forge-org/web -- src/api-client-contract.test.ts
Exit: 1
Test Files  1 failed (1)
Tests       1 failed | 1 passed (2)
Failure: TypeError: organizationApi.getProject is not a function
```

This was the expected failure because the requested operations were absent from the public facade.

## GREEN verification

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run build --workspace=@forge-org/api-client` | 0 | TypeScript build completed. |
| `npm run test --workspace=@forge-org/web -- src/api-client-contract.test.ts` | 0 | 1 test file passed; 2 tests passed. Checks exact workspace URL, default GET behavior, PATCH method, JSON content type/body, and same-origin credentials. |
| `npm run test:contract --workspace=@forge-org/api-client` | 0 | Build completed; 3 package contract tests passed, 0 failed. |
| `git diff --check` | 0 | No whitespace errors. |

After building the package, an initial focused rerun failed because the assertion expected an explicit `method: 'GET'`. Inspection of the observed Fetch request showed `getApiJson` uses Fetch's default GET and supplies same-origin credentials (plus `signal: undefined`). The assertion was corrected to verify the default GET and credentials; the final focused run passed.

## Changed paths

- `apps/web/src/api-client-contract.test.ts`
- `packages/api-client/src/organization.ts`
- `packages/api-client/src/types.ts`
- `.superpowers/sdd/project-overview-parity/task-1-report.md` (this report)

## Commit

Implementation commit: `7fd2b16a68e2e317d38688f6279d68e914b82b7f` (`feat(api-client): add project overview operations`).

## Self-review

- Both operations use the required workspace-scoped `/api/v1/workspaces/{workspaceId}/projects/{projectId}` path and existing `getApiJson<Project>` / `sendJson<Project>` transports.
- PATCH serializes the generated `ProjectUpdate` value as JSON; transport contract coverage confirms `Content-Type: application/json` and `credentials: 'same-origin'`.
- `organizationApi` continues to expose capabilities through its existing compatibility spread; facade shape was not changed.
- The only limitation encountered was that GET is expressed through Fetch's default method, not an explicit `GET` option. The final contract test records this actual behavior and verifies URL and credentials.
