import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { organizationApi, type Project, type Workspace } from '@forge-org/api-client';
import { Button } from '@forge-org/ui';
import {
  OrganizationPage,
  ProjectOverviewPage,
  WorkspaceSettingsPage,
} from '../features/organization';
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => localStorage.getItem('forge-active-workspace') ?? '',
  );
  const [navigationError, setNavigationError] = useState('');
  const routeWorkspaceId = getProjectContext(location.pathname)?.workspaceId;
  const navigationWorkspaceId = routeWorkspaceId ?? activeWorkspaceId;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === navigationWorkspaceId);
  const [projectWorkspaceId, setProjectWorkspaceId] = useState('');
  const [projectRefresh, setProjectRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    void organizationApi
      .listWorkspaces()
      .then((items) => {
        if (!current) return;
        setWorkspaces(items);
        const saved = localStorage.getItem('forge-active-workspace') ?? '';
        const selected = items.some((item) => item.id === saved) ? saved : (items[0]?.id ?? '');
        setActiveWorkspaceId(selected);
        if (selected) localStorage.setItem('forge-active-workspace', selected);
        else localStorage.removeItem('forge-active-workspace');
      })
      .catch((cause: unknown) => {
        if (current)
          setNavigationError(
            cause instanceof Error ? cause.message : 'Workspace navigation unavailable.',
          );
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    function onActiveWorkspaceChange(event: Event) {
      const id = (event as CustomEvent<{ workspaceId?: string }>).detail?.workspaceId;
      if (!id) return;
      setActiveWorkspaceId(id);
      localStorage.setItem('forge-active-workspace', id);
    }
    function onWorkspaceCreated(event: Event) {
      const workspace = (event as CustomEvent<{ workspace?: Workspace }>).detail?.workspace;
      if (workspace)
        setWorkspaces((items) => [...items.filter((item) => item.id !== workspace.id), workspace]);
    }
    function onWorkspaceUpdated(event: Event) {
      const workspace = (event as CustomEvent<{ workspace?: Workspace }>).detail?.workspace;
      if (workspace)
        setWorkspaces((items) =>
          items.map((item) => (item.id === workspace.id ? workspace : item)),
        );
    }
    function onProjectsChanged() {
      setProjectRefresh((value) => value + 1);
    }
    window.addEventListener('forge:active-workspace-change', onActiveWorkspaceChange);
    window.addEventListener('forge:workspace-created', onWorkspaceCreated);
    window.addEventListener('forge:workspace-updated', onWorkspaceUpdated);
    window.addEventListener('forge:projects-changed', onProjectsChanged);
    return () => {
      window.removeEventListener('forge:active-workspace-change', onActiveWorkspaceChange);
      window.removeEventListener('forge:workspace-created', onWorkspaceCreated);
      window.removeEventListener('forge:workspace-updated', onWorkspaceUpdated);
      window.removeEventListener('forge:projects-changed', onProjectsChanged);
    };
  }, []);
  useEffect(() => {
    if (routeWorkspaceId && workspaces.some((workspace) => workspace.id === routeWorkspaceId)) {
      localStorage.setItem('forge-active-workspace', routeWorkspaceId);
    }
  }, [routeWorkspaceId, workspaces]);
  useEffect(() => {
    let current = true;
    if (!navigationWorkspaceId)
      return () => {
        current = false;
      };
    void organizationApi
      .listProjects(navigationWorkspaceId, '', 'active')
      .then((items) => {
        if (current) {
          setProjects(items);
          setProjectWorkspaceId(navigationWorkspaceId);
        }
      })
      .catch((cause: unknown) => {
        if (current) {
          setProjectWorkspaceId(navigationWorkspaceId);
          setNavigationError(cause instanceof Error ? cause.message : 'Projects unavailable.');
        }
      });
    return () => {
      current = false;
    };
  }, [navigationWorkspaceId, projectRefresh]);
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
  function selectWorkspace(id: string) {
    setActiveWorkspaceId(id);
    localStorage.setItem('forge-active-workspace', id);
    window.dispatchEvent(
      new CustomEvent('forge:active-workspace-change', { detail: { workspaceId: id } }),
    );
    navigate('/');
  }
  const context = getProjectContext(location.pathname);
  const mobileWorkspaceId = navigationWorkspaceId || activeWorkspaceId;
  const mobileBoardPath = context
    ? `/planning/${context.workspaceId}/${context.projectId}`
    : projectWorkspaceId === mobileWorkspaceId && projects[0]
      ? `/planning/${mobileWorkspaceId}/${projects[0].id}`
      : undefined;
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
      <header className={styles.mobileHeader} aria-label="Workspace controls">
        <Link to="/" className={styles.brand} aria-label="F FORGE">
          <span className={styles.mark}>F</span> FORGE
        </Link>
        <div className={styles.mobileWorkspace}>
          <WorkspaceSwitcher
            value={navigationWorkspaceId}
            workspaces={workspaces.map((workspace) => ({
              id: workspace.id,
              name: workspace.archived_at ? `${workspace.name} (archived)` : workspace.name,
            }))}
            onChange={selectWorkspace}
            currentName={
              activeWorkspace?.name ??
              (navigationError ? 'Workspace unavailable' : 'Local Workspace')
            }
          />
        </div>
        <Button variant="ghost" onClick={() => setPaletteOpen(true)} aria-label="Search">
          Search
        </Button>
        <label className={`${styles.themeControl} ${styles.mobileTheme}`}>
          Appearance{' '}
          <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
      </header>
      <div className={styles.shellGrid}>
        <aside className={styles.sidebar}>
          <Link to="/" className={styles.brand}>
            <span className={styles.mark}>F</span> FORGE
          </Link>
          <Link to="/" className={styles.mobileBrand} aria-label="F FORGE Workspace home">
            <span className={styles.mark}>F</span> FORGE
          </Link>
          <WorkspaceSwitcher
            value={navigationWorkspaceId}
            workspaces={workspaces.map((workspace) => ({
              id: workspace.id,
              name: workspace.archived_at ? `${workspace.name} (archived)` : workspace.name,
            }))}
            onChange={selectWorkspace}
            currentName={
              activeWorkspace?.name ??
              (navigationError ? 'Workspace unavailable' : 'Local Workspace')
            }
          />
          {navigationError && (
            <p role="alert" className={styles.navigationError}>
              {navigationError}
            </p>
          )}
          <nav aria-label="Product navigation" className={styles.productNav}>
            <NavigationItem to="/" end label="Workspace" />
            {activeWorkspaceId && (
              <NavigationItem
                to={`/workspaces/${activeWorkspaceId}/settings`}
                label="Workspace settings"
              />
            )}
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
          {navigationWorkspaceId && (
            <nav aria-label="Project navigation" className={styles.projectNav}>
              <h2>Projects</h2>
              {projectWorkspaceId !== navigationWorkspaceId ? (
                <span className={styles.emptyProjects}>Loading projects…</span>
              ) : projects.length === 0 ? (
                <span className={styles.emptyProjects}>No active projects</span>
              ) : (
                projects.map((project) => (
                  <Link key={project.id} to={`/planning/${navigationWorkspaceId}/${project.id}`}>
                    {project.name}
                  </Link>
                ))
              )}
            </nav>
          )}
          <div className={styles.localMode}>
            <strong>LOCAL MODE</strong>
            <span>Private workspace</span>
          </div>
        </aside>
        <div className={styles.contentColumn}>
          <PageHeader
            className={styles.topbar}
            eyebrow={activeWorkspace?.name ?? 'Local workspace'}
            title="FORGE Org Tool"
          >
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
              <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
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
              <Route path="/transfer/workspaces/:workspaceId" element={<TransferPage />} />
              <Route
                path="/transfer/:workspaceId/:projectId/:scope/:destinationId"
                element={<TransferPage />}
              />
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
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <Link to="/" aria-current={!context ? 'page' : undefined}>
          Projects
        </Link>
        {mobileBoardPath ? (
          <Link
            to={mobileBoardPath}
            aria-current={location.pathname.startsWith('/planning/') ? 'page' : undefined}
          >
            Board
          </Link>
        ) : (
          <span aria-disabled="true">Board</span>
        )}
        <Button variant="ghost" onClick={() => setPaletteOpen(true)} aria-label="Search">
          Search
        </Button>
        {mobileWorkspaceId ? (
          <Link to={`/workspaces/${mobileWorkspaceId}/settings`}>Settings</Link>
        ) : (
          <span aria-disabled="true">Settings</span>
        )}
      </nav>
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
  if (pathname.startsWith('/workspaces/')) {
    return (
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to="/">Workspace</Link>
          </li>
          <li>
            <span aria-current="page">Settings</span>
          </li>
        </ol>
      </nav>
    );
  }
  const context = getProjectContext(pathname);
  if (!context) return null;
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[0];
  const [, , , fourth] = parts;
  const isEpic = section === 'planning' && fourth === 'epics';
  const isWorkItem = section === 'planning' && fourth === 'features';
  const crumbs = [
    { label: 'Workspace', href: '/' },
    { label: 'Project board', href: `/planning/${context.workspaceId}/${context.projectId}` },
  ];
  if (section === 'planning' && !fourth) crumbs.pop();
  const currentLabel =
    section === 'projects'
      ? 'Overview'
      : isWorkItem
        ? 'Story / Bug'
        : isEpic
          ? 'Epic'
          : section === 'transfer'
            ? 'Transfer'
            : 'Project board';
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
