# M1 acceptance

| ID          | Acceptance evidence                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1-API-001  | pytest/httpx health test and live uvicorn request.                                                                                                                     |
| M1-API-002  | OpenAPI export check and route inventory.                                                                                                                              |
| M1-UI-001   | Vitest/RTL test plus Chromium smoke at desktop and mobile viewport.                                                                                                    |
| M1-UI-002   | Focused public-contract tests for Card root/semantic option and Button native/loading/pressed behavior, plus token-backed hover/pressed CSS review.                    |
| M1-UI-003   | Development-only `/__components` catalog/search/theme test, production bundle assertion proving route exclusion, isolated Chromium dark/light desktop/mobile evidence. |
| M1-ARCH-001 | Boundary script and architecture test suite.                                                                                                                           |
| M1-TOOL-001 | `package-lock.json`, `apps/api/uv.lock`, npm checks/build, pytest/Ruff/mypy.                                                                                           |
| M1-SEC-001  | Tracked-file secret/data audit and staged-file review.                                                                                                                 |
