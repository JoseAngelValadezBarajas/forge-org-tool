import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@forge-org/ui';
import { OrganizationPage, ProjectOverviewPage } from '../features/organization';
import { EpicDetailPage, FeatureDetailPage, PlanningPage } from '../features/planning';
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
  const location = useLocation();
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
  const context = getProjectContext(location.pathname);
  const productDestinations = [
    {
      id: 'overview',
      label: 'Overview',
      path: context && `/projects/${context.workspaceId}/${context.projectId}`,
    },
    {
      id: 'planning',
      label: 'Planning',
      path: context && `/planning/${context.workspaceId}/${context.projectId}`,
    },
    {
      id: 'transfer',
      label: 'Transfer',
      path: context && `/transfer/${context.workspaceId}/${context.projectId}`,
    },
  ];
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
            {productDestinations.map((destination) =>
              destination.path ? (
                <NavigationItem
                  key={destination.id}
                  to={destination.path}
                  label={destination.label}
                />
              ) : (
                <span key={destination.id} aria-disabled="true" className={styles.disabledNavItem}>
                  {destination.label} ({context ? 'choose a feature' : 'choose a project'})
                </span>
              ),
            )}
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
            <Breadcrumbs pathname={location.pathname} />
            <Routes>
              <Route path="/" element={<OrganizationPage />} />
              <Route path="/projects/:workspaceId/:projectId" element={<ProjectOverviewPage />} />
              <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
              <Route
                path="/planning/:workspaceId/:projectId/epics/:epicId"
                element={<EpicDetailPage />}
              />
              <Route
                path="/planning/:workspaceId/:projectId/features/:featureId"
                element={<FeatureDetailPage />}
              />
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
          ...productDestinations
            .filter((destination): destination is typeof destination & { path: string } =>
              Boolean(destination.path),
            )
            .map((destination) => ({
              id: destination.id,
              label: destination.label,
              onSelect: () => go(destination.path),
            })),
          ...(import.meta.env.DEV
            ? [{ id: 'components', label: 'Component host', onSelect: () => go('/__components') }]
            : []),
        ]}
      />
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const context = getProjectContext(pathname);
  if (!context) return null;
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[0];
  const projectPath = `/projects/${context.workspaceId}/${context.projectId}`;
  const featurePath = `/planning/${context.workspaceId}/${context.projectId}/features/${context.featureId}`;
  const labelBySection: Record<string, string> = {
    projects: 'Overview',
    planning: context.featureId ? 'Feature' : 'Planning',
    transfer: 'Transfer',
  };
  const crumbs = [
    { label: 'Workspace', href: '/' },
    { label: 'Project', href: projectPath },
    ...(context.featureId && section !== 'planning'
      ? [{ label: 'Feature', href: featurePath }]
      : []),
  ];
  const currentLabel = labelBySection[section] ?? 'Project';
  if (crumbs.at(-1)?.label !== currentLabel) crumbs.push({ label: currentLabel, href: '' });
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`}>
            {crumb.href ? (
              <Link to={crumb.href}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function getProjectContext(pathname: string) {
  const [section, workspaceId, projectId, fourth, fifth] = pathname.split('/').filter(Boolean);
  if (!section || !workspaceId || !projectId) return null;
  if (!['projects', 'planning', 'transfer'].includes(section)) {
    return null;
  }
  const featureId = section === 'planning' && fourth === 'features' ? fifth : undefined;
  return { workspaceId, projectId, featureId };
}
