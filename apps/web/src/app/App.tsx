import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { Button } from '@forge-org/ui';
import { OrganizationPage } from '../features/organization';
import { FeatureDetailPage, PlanningPage } from '../features/planning';
import { ReadinessPage } from '../features/readiness';
import { WorkbenchPage } from '../features/workbench';
import { DeliveryPage } from '../features/delivery';
import { RepositoriesPage } from '../features/repositories';
import { ContextPage } from '../features/context';
import { TransferPage } from '../features/transfer';
import styles from './App.module.css';
import { CommandPalette, NavigationItem, PageHeader, WorkspaceSwitcher } from './shell';
import { ThemeProvider, useTheme } from './theme';

const ComponentGallery = import.meta.env.DEV
  ? lazy(() =>
      import('./component-gallery/ComponentGallery').then(({ ComponentGallery: Gallery }) => ({
        default: Gallery,
      })),
    )
  : null;
export function App() {
  return (
    <ThemeProvider applyToDocument>
      <ApplicationShell />
    </ThemeProvider>
  );
}

function ApplicationShell() {
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  function go(path: string) {
    setPaletteOpen(false);
    navigate(path);
  }
  return (
    <div className={styles.app} data-testid="application-shell" data-theme={resolvedTheme}>
      <div className={styles.shellGrid}>
        <aside className={styles.sidebar}>
          <Link to="/" className={styles.brand}>
            <span className={styles.mark}>F</span> FORGE
          </Link>
          <WorkspaceSwitcher currentName="Local Workspace" />
          <nav aria-label="Product navigation" className={styles.productNav}>
            <NavigationItem to="/" end label="Workspace" />
            {import.meta.env.DEV && <NavigationItem to="/__components" label="Component host" />}
          </nav>
          <div className={styles.localMode}>
            <strong>LOCAL MODE</strong>
            <span>Private workspace</span>
          </div>
        </aside>
        <div className={styles.contentColumn}>
          <PageHeader className={styles.topbar} eyebrow="Local Workspace" title="FORGE Org Tool">
            <Button
              variant="ghost"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              Command palette
            </Button>
            <label className={styles.themeControl}>
              Appearance{' '}
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as typeof theme)}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </label>
          </PageHeader>
          <main id="main" className={styles.main}>
            <Routes>
              <Route path="/" element={<OrganizationPage />} />
              <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
              <Route
                path="/planning/:workspaceId/:projectId/features/:featureId"
                element={<FeatureDetailPage />}
              />
              <Route
                path="/readiness/:workspaceId/:projectId/:featureId"
                element={<ReadinessPage />}
              />
              <Route path="/workbench/:workspaceId/:projectId" element={<WorkbenchPage />} />
              <Route path="/delivery/:workspaceId/:projectId" element={<DeliveryPage />} />
              <Route path="/repositories/:workspaceId/:projectId" element={<RepositoriesPage />} />
              <Route path="/context/:workspaceId/:projectId/:featureId" element={<ContextPage />} />
              <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
              {ComponentGallery && (
                <Route
                  path="/__components"
                  element={
                    <Suspense fallback={<p>Loading component host…</p>}>
                      <ComponentGallery />
                    </Suspense>
                  }
                />
              )}
              <Route path="*" element={<p>Page not found.</p>} />
            </Routes>
          </main>
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={[
          { id: 'organization', label: 'Organization', onSelect: () => go('/') },
          ...(import.meta.env.DEV
            ? [{ id: 'components', label: 'Component host', onSelect: () => go('/__components') }]
            : []),
        ]}
      />
    </div>
  );
}
