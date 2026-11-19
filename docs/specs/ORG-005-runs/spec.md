# ORG-005 Reported runs and handoffs

> **Status: retired from the active product (MVP 1.0).** Kept as a historical record. The code was removed; legacy SQLite tables are preserved by migrations only. See [`docs/product/mvp-1.0.md`](../../product/mvp-1.0.md).

Runs record human-reported work only. `execution_mode=manual` and executor
labels do not claim that FORGE executed an agent, read a conversation, or
verified delivery. Run state transitions use optimistic versions and terminal
states cannot transition again. Events are append-only.

Handoffs start as drafts. A ready handoff creates an immutable
`forge-handoff-v1` revision; acknowledgement records review responsibility for
the exact revision and never certifies implementation, testing, CI, or release.
