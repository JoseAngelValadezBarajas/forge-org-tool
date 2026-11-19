# ORG-006 Delivery truth

> **Status: retired from the active product (MVP 1.0).** Kept as a historical record. The code was removed; legacy SQLite tables are preserved by migrations only. See [`docs/product/mvp-1.0.md`](../../product/mvp-1.0.md).

Evidence carries explicit provenance (`REPORTED`, `OBSERVED`, `VERIFIED`, or
`UNKNOWN`) and can be invalidated without erasing history. Release candidates
must be frozen before gate evaluation. Gates are explainable and return
`PASS`/`BLOCKED`; blocked results never imply publication or deployment.
Separate verification rules are deterministic, stored with input fingerprints,
and become stale when their referenced evidence or candidate state changes.
