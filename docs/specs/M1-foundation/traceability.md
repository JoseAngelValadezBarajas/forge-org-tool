# M1 traceability

| Requirement | Planned test/evidence | Status |
| --- | --- | --- |
| M1-API-001 | `apps/api/tests/test_health.py`, live HTTP smoke | Verified: pytest 2 passed; live 200 with `bootstrap-only` |
| M1-API-002 | `tooling/scripts/export-openapi.py --check` | Verified: contract matches; fabricated workspace POST returned 404 |
| M1-UI-001 | Web component/integration test and Chromium smoke | Verified: Vitest 3 passed; Chromium smoke 4 passed |
| M1-UI-002 | Shared action interaction and accessible-state test | Verified: disabled/loading test passed with native `disabled` and `aria-busy` |
| M1-UI-003 | Gallery test, production route absence, Chromium theme check | Verified: dark/light interaction passed; production markers absent |
| M1-ARCH-001 | Boundary script and Node architecture tests | Verified: boundary check passed; architecture tests 5/5 |
| M1-TOOL-001 | Lockfile and quality command evidence | Verified: npm/uv locks committed; clean clone bootstrap passed |
| M1-SEC-001 | Secret/data audit before publication | Verified: staged secret/path audit clean; no forbidden data files staged |

This table is updated only with observed test results; manual planning state is not CI or deployment evidence. GitHub Actions Quality succeeded for the implementation commit `152bda5e59fc24c69e170b504febfe64e29b5240`; documentation is finalized in `786c58f7bdaacc9c130e4f84cd67210acb8b2528`.
