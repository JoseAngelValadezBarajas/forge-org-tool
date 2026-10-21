# Token reconciliation evidence

This record resolves the 23 rows in the Figma token drift register against its
Figma and React CSS columns and the authoritative package source. Register
entries are design documentation, not proof that each value is a live Figma
variable. Dark foundation values were independently surfaced on concrete
Foundation children on page `1:3` (frame `2:45`): `bg` `2:50`, `surface`
`2:53`, `surface-raised` `2:56`, `surface-hover` `2:59`, `border` `2:62`,
`border-strong` `2:65`, `text` `2:68`, `text-muted` `2:71`, `text-subtle`
`2:74`, `accent` `2:77`, `accent-soft` `2:80`, `success` `2:83`, `warning`
`2:86`, `danger` `2:89`, and `info` `2:92`. The live variable query supplied
by the user on concrete node `234:2` independently confirms `accent`, `text`,
`text-muted`, `border`, `warning`, and `bg`; the user query on concrete node
`185:439` confirms `warning`, `text`, `text-muted`, `surface-raised`, and
`surface`. These are dark-specific values, not a universal multi-mode
declaration.

Metadata read on 2026-10-21 identifies page node `1:3` as “02 · SYSTEM /
Foundations & Tokens”, `2:49` as the Color Tokens frame, and `16:2` as the Color
Accessibility Audit. The audit describes the graphite/copper palette as kept
and says subtle text plus light accent/success/warning were adjusted for
readability. This page metadata and its children are design evidence, not a
human parity sign-off.

For each row below, the node is the concrete drift-register row read on
2026-10-21. “Figma side” and “old CSS side” reproduce the register; values now emitted come from
`packages/tokens/tokens.json`. Register-recorded light pairs are implemented as
the current light token extension. The Figma foundations page does not establish
that the whole palette is a canonical Light mode, and no human visual
certification is claimed.

| Token                       | Drift row (evidence date 2026-10-21) | Figma side               | Previous React CSS       | Classification / resolution                                                                                                                                                                             |
| --------------------------- | ------------------------------------ | ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color/bg`                  | `185:452`                            | D `#111315`; L `#f6f5f2` | D `#111315`; L `#f1efeb` | Intentional documented light extension; corrected to register value. Dark confirmed by `2:50` and user query `234:2`.                                                                                   |
| `color/accent`              | `185:461`                            | D `#d8874d`; L `#a94f18` | D `#d8874d`; L `#ad5e2e` | Intentional documented light extension; corrected. Dark confirmed by `2:77` and user query `234:2`.                                                                                                     |
| `color/surface-raised`      | `185:470`                            | D `#1e2226`; L `#fbfaf8` | D `#202428`; L `#ffffff` | Requires implementation correction in old CSS; token source matches register. Dark confirmed by `2:56` and user query `185:439`.                                                                        |
| `color/warning`             | `185:479`                            | D `#e2ae59`; L `#855b0f` | D `#e8b86f`; L `#a46d19` | Requires implementation correction in old CSS; dark confirmed by `2:86` and user queries `234:2` / `185:439`.                                                                                           |
| `color/surface-interactive` | `185:488`                            | D `#1b1f22`; L `#e9e8e5` | D `#1b1f22`; L `#e5e2dc` | Requires human design decision: register records these values, but the supplied live query did not confirm this as a variable. Kept as implementation extension; no Figma-variable claim.               |
| `radius/sm`                 | `185:497`                            | `6px`                    | `7px`                    | Requires implementation correction; source now uses `6px` from register.                                                                                                                                |
| `radius/md`                 | `185:506`                            | `10px`                   | `8px`                    | Requires implementation correction; source now uses `10px` from register.                                                                                                                               |
| `space/8`                   | `185:515`                            | `32px`                   | `36px`                   | Requires implementation correction; source now uses `32px` from register.                                                                                                                               |
| `color/surface`             | `220:822`                            | D `#171a1d`; L `#ffffff` | D `#171a1d`; L `#faf9f6` | Intentional documented light extension; corrected. Dark confirmed by `2:53` and user query `185:439`.                                                                                                   |
| `color/border`              | `220:831`                            | D `#30363d`; L `#dddad4` | D `#30363d`; L `#d3cec5` | Intentional documented light extension; corrected. Dark confirmed by `2:62` and user query `234:2`.                                                                                                     |
| `color/text`                | `220:840`                            | D `#f5f3ee`; L `#181a1d` | D `#f5f3ee`; L `#202225` | Intentional documented light extension; corrected. Dark confirmed by `2:68` and user queries `234:2` / `185:439`.                                                                                       |
| `color/text-muted`          | `220:849`                            | D `#9ea5ad`; L `#6d706f` | D `#9ea5ad`; L `#626b74` | Intentional documented light extension; corrected. Dark confirmed by `2:71` and user queries `234:2` / `185:439`.                                                                                       |
| `color/text-subtle`         | `220:858`                            | D `#7a838d`; L `#6b6e68` | D `#7a838d`; L `#555e68` | Requires implementation correction; added semantic values from register. Dark confirmed by `2:74`.                                                                                                      |
| `color/accent-soft`         | `220:867`                            | D `#3a261b`; L `#f7e7db` | D `#3a2920`; L `#f0dfd3` | Requires implementation correction; source matches register. Dark confirmed by `2:80`.                                                                                                                  |
| `color/success`             | `220:876`                            | D `#63c18c`; L `#187644` | D `#63c18c`; L `#2f8a5c` | Intentional documented light extension; corrected. Dark confirmed by `2:83`.                                                                                                                            |
| `color/danger`              | `220:885`                            | D `#e57373`; L `#b52d38` | D `#e57373`; L `#b34f4f` | Intentional documented light extension; corrected. Dark confirmed by `2:89`.                                                                                                                            |
| `color/info`                | `220:894`                            | D `#71a7e8`; L `#2767a0` | D `#71a7e8`; L `#4378b7` | Requires implementation correction; light semantic token now matches register. Dark confirmed by `2:92`.                                                                                                |
| `color/surface-tag`         | `220:903`                            | D `#202428`; L `#e5e2dd` | D `#24282c`; L `#e3ded6` | Requires implementation correction and human design decision: register records these values, but no live variable confirmation was provided. Kept as implementation extension; no Figma-variable claim. |
| `color/surface-track`       | `220:912`                            | D `#2a2f34`; L `#e3e1dc` | D `#2a2f34`; L `#d1cec7` | Intentional documented light extension; corrected from register.                                                                                                                                        |
| `color/border-subtle`       | `220:921`                            | D `#262b30`; L `#e1ded8` | D `#262b30`; L `#dcd7cf` | Requires implementation correction; both semantic values now match the register.                                                                                                                        |
| `color/status-success-bg`   | `220:930`                            | D `#1b2a24`; L `#e6f4eb` | D `#1f3329`; L `#d9f0e2` | Requires implementation correction; source now matches register.                                                                                                                                        |
| `color/status-warning-bg`   | `220:939`                            | D `#2a251b`; L `#fcf3e2` | D `#2a251b`; L `#f4e8cc` | Intentional documented light extension; corrected from register.                                                                                                                                        |
| `color/text-dark-on-accent` | `220:948`                            | D `#111315`; L `#ffffff` | D `#111315`; L `#211810` | Intentional documented light extension; corrected. Dark confirmed by user query `234:2`.                                                                                                                |

The `surfaceInteractive` and `surfaceTag` values are covered by tests as
implementation values only. Human confirmation is still needed before treating
them as canonical Figma variables. Human review is also needed to approve the
register-derived light values as a complete Light mode. No Figma master was
modified.

The token source now separates a small primitive palette from semantic theme
roles. Palette entries reuse values already present in the documented Dark or
Light tokens; the generated `--forge-palette-*` names are code-level foundations
only. They do not imply that Figma defines matching shade scales or variable
names.

## Validation

`npm run check:tokens` checks generated-file freshness, component token
references, and 4.5:1 contrast for semantic text/status foreground pairs in both
modes. `npm test --workspace=@forge-org/tokens` repeats the contrast and
semantic-coverage assertions. Passing these checks is code evidence, not human
visual certification.
