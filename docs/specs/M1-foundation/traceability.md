# M1 traceability

| Requirement | Planned test/evidence | Status |
| --- | --- | --- |
| M1-API-001 | `apps/api/tests/test_health.py`, live HTTP smoke | Verified: pytest 2 passed; live 200 with `bootstrap-only` |
| M1-API-002 | `tooling/scripts/export-openapi.py --check` | Verified: contract matches; fabricated workspace POST returned 404 |
| M1-UI-001 | Web component/integration test and Chromium smoke | Verified: Vitest 4 passed; Chromium smoke 4 passed |
| M1-UI-002 | `apps/web/src/ui-contracts.test.tsx`, shared Button/Card source and token-backed CSS | Verified: focused contract tests 3/3; Card root/ref/native props and Button loading/disabled/pressed behavior pass; visual states remain `IMPLEMENTED_NOT_REVIEWED` |
| M1-UI-003 | Development-only `/__components` Component Host test, production route absence, isolated Chromium dark/light check | Verified: `/__components` is the only Component Host route; Vitest 20/20 across 11 files, production markers absent, isolated Chromium smoke 18/18, dark/light desktop/mobile screenshots retained |
| M1-ARCH-001 | Boundary script and Node architecture tests | Verified: boundary check passed; architecture tests 5/5 |
| M1-TOOL-001 | Lockfile and quality command evidence | Verified: npm/uv locks committed; clean clone bootstrap passed |
| M1-SEC-001 | Secret/data audit before publication | Verified: staged secret/path audit clean; no forbidden data files staged |

This table is updated only with observed test results; manual planning state is not CI or deployment evidence. The final audit-correction commit is recorded after the focused verification pass; visual parity remains distinct from automated behavior verification.
