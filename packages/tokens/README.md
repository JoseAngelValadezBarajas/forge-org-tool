# @forge-org/tokens

The versioned Forge design-token contract. `tokens.json` is authoritative; `npm run generate:tokens` generates `src/tokens.css`, and package builds distribute that generated file. Never edit generated CSS directly.

The CSS contract is `data-theme="dark"` or `data-theme="light"`. Dark is the default on `:root` when no attribute is present. A nested element with either attribute starts an isolated semantic token scope. The package does not manage theme state or persistence.

Semantic variables include surfaces, text, borders, interactive states, focus,
status, selection, overlays, and elevations. Foundations also provide spacing,
radius, typography, motion, responsive values, and border widths. Consult
[`token-reconciliation.md`](../../docs/design/token-reconciliation.md) for
evidence and status for each historical drift. Light mode is not claimed as a
human-approved canonical Figma mode. In particular, the intended variable
status of `surfaceInteractive` and `surfaceTag` remains an open design decision.
The generated CSS also exposes a small primitive palette (`--forge-palette-*`)
sampled only from values already present in the current token source. These
primitive samples are implementation foundations, not a claim that Figma
defines those palette scales or names.

```css
@import '@forge-org/tokens/tokens.css';

.panel {
  color: var(--forge-text-primary);
  background: var(--forge-surface-raised);
  border-color: var(--forge-border-subtle);
}
```

Set `data-theme="light"` on a host element to scope light tokens; omit the
attribute for the default dark palette.

Build and validate with `npm run generate:tokens`, `npm run check:tokens`,
`npm run build --workspace=@forge-org/tokens`, and
`npm test --workspace=@forge-org/tokens`. Package consumers should import
`@forge-org/tokens/tokens.css`; applications must not depend on the package's
source directory.
