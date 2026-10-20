# Component reuse and visual parity

The target visual source is Figma file `r10szKLgiIPVi2NBmbjTpm`, pages 19 and
20. The legacy implementation is not a licensing source for UI code, CSS,
icons, screenshots or sample data.

## Reuse candidates

| Generic concern | New owner | Reuse rule |
| --- | --- | --- |
| Button, Input, Card, Badge, StatusChip | `packages/ui` | One accessible implementation per generic component; features map domain state to tone. |
| spacing, color, typography, radii, focus | `packages/tokens` | Semantic tokens only; reconcile against the inspected Figma variables before visual certification. |
| shell/sidebar/header/layout primitives | `app` plus `packages/ui` | App composes; feature modules do not own global navigation. |
| board, readiness, provenance, evidence detail | feature packages | Domain-specific composition may use generic primitives but must not duplicate them. |
| loading, empty, error and stale states | `packages/ui` primitives plus feature content | Copy must state what is known, unknown and not implemented. |

## Review gates

M1 browser smoke is foundation evidence only. Functional visual parity requires
Chromium screenshots at the agreed desktop and mobile sizes, console/network
checks, token reconciliation against Figma, and review of retained evidence.
Until those checks pass, the project must not claim pixel parity or visual
certification. Figma sample content must never become fabricated product data.
