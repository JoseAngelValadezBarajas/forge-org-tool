# Using FORGE themes in an external React application

`@corefoundry-labs/forge-tokens` owns the semantic CSS variables and the `data-theme="dark"` /
`data-theme="light"` contract. `@corefoundry-labs/forge-ui` consumes those variables but does
not own application preference, browser storage, or operating-system state.
An unrelated React application can therefore use the compiled packages without
depending on `apps/web`:

```tsx
import { useState } from 'react';
import '@corefoundry-labs/forge-tokens/tokens.css';
import '@corefoundry-labs/forge-ui/styles.css';
import { Button, Card, useSystemTheme } from '@corefoundry-labs/forge-ui';

type ThemeMode = 'dark' | 'light' | 'system';

function Example() {
  const systemTheme = useSystemTheme();
  const [mode, setMode] = useState<ThemeMode>(() => {
    let saved: string | null = null;
    try {
      if (typeof window !== 'undefined') saved = window.localStorage.getItem('appearance');
    } catch {
      // Storage may be unavailable; the default remains usable.
    }
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'dark';
  });
  const resolved = mode === 'system' ? systemTheme : mode;
  return (
    <main data-theme={resolved}>
      <label>
        Appearance
        <select
          value={mode}
          onChange={(event) => {
            const next = event.target.value as ThemeMode;
            setMode(next);
            try {
              window.localStorage.setItem('appearance', next);
            } catch {
              // Explicit preference still works when persistence is unavailable.
            }
          }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <Card>
        <Button>Continue</Button>
        <p style={{ color: 'var(--forge-text-secondary)' }}>Semantic token example</p>
      </Card>
    </main>
  );
}
```

Use the actual package exports and compiled CSS from the installed packages; do
not import application code. Set the resolved theme on the narrowest common
ancestor of the themed UI. A nested preview can use its own `data-theme` scope
without changing the consuming application's preference. For server-rendered
applications, guard browser APIs and apply the saved/resolved theme before the
first paint to avoid a theme flash.

The packed external-consumer test installs the built token, icon, UI, and API
client tarballs into a disposable React application. It typechecks and builds
that application, verifies real component styles and semantic token resolution,
checks generic CSS isolation and React deduplication, switches Dark/Light/System,
follows an emulated operating-system theme change, and verifies persisted mode
after reload. This is automated package-consumption evidence, not a human visual
parity certification.
