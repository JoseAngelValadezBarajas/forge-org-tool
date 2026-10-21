# @forge-org/ui

Reusable React components for Forge-compatible products. The package exposes compiled ESM and TypeScript declarations from `dist`, with `@forge-org/tokens` as an explicit runtime style dependency and React as a peer dependency.

```tsx
import { Button, FormField, Input } from '@forge-org/ui';

<FormField label="Workspace name" hint="Shown to collaborators">
  <Input />
</FormField>;
<Button>Save</Button>;
```

Build and test this package independently from the repository root with `npm run build --workspace=@forge-org/ui` and `npm test --workspace=@forge-org/ui`. Consumers can import the optional aggregate stylesheet from `@forge-org/ui/styles.css`.
