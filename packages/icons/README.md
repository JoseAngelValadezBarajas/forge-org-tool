# @forge-org/icons

Typed, tree-shakeable React SVG icons for FORGE Org Tool. The package contains original path geometry authored for this library; no Figma-exported assets or third-party icon assets are redistributed.

```tsx
import { Search, AlertTriangle } from '@forge-org/icons';

<Search aria-label="Search" size={20} />
<AlertTriangle title="Attention required" />
```

Icons inherit `currentColor` and default to a decorative, `aria-hidden` SVG. Pass `title` (or an SVG accessible label) when the icon itself conveys information; in controls, prefer naming the owning button and keep its icon decorative. `size` accepts a number or CSS length and defaults to 24. Standard SVG props and `ref` are forwarded. Each icon has a dedicated directory, stylesheet, test, and barrel; importing the package root exposes named ESM exports for tree shaking.

Build independently with `npm run build --workspace=@forge-org/icons`; run contract tests with `npm test --workspace=@forge-org/icons`.

The paths are original normalized interpretations informed by the canonical Figma masters listed in `docs/design/design-system-parity.json`. They are not claimed to be pixel-identical. Human visual review remains outstanding.
