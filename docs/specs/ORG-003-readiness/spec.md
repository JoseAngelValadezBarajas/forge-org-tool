# ORG-003 Decisions, invariants, and readiness

Decisions and invariants are project-scoped planning records. Decisions carry
explicit status and revision snapshots; invariants carry revision snapshots and
feature-scoped acknowledgements guarded by the expected revision. The readiness
engine evaluates a normalized local snapshot using deterministic rules R01–R06.

`READY_TO_START` means planning inputs satisfy the current rule set. It never
means code, repository, CI, deployment, release, or technical verification.
Preview is non-persistent. Saved evaluations retain their input fingerprint and
become explicitly stale when planning inputs change.
