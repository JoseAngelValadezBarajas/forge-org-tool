import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  organizationApi,
  type PlanningOverview,
  type Project,
  type Workspace,
} from '@forge-org/api-client';
import { Button } from '@forge-org/ui';
import {
  OrganizationPage,
  ProjectOverviewPage,
  WorkspaceSettingsPage,
} from '../features/organization';
import { EpicDetailPage, FeatureDetailPage, PlanningPage } from '../features/planning';
import { TransferPage } from '../features/transfer';
import styles from './App.module.css';
import { CommandPalette, NavigationItem, WorkspaceSwitcher } from './shell';
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
  const workspaceRevision = useRef(0);
  const context = getProjectContext(location.pathname);
  const routeWorkspaceId = context?.workspaceId;
  const navigationWorkspaceId = routeWorkspaceId ?? activeWorkspaceId;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === navigationWorkspaceId);
  const [projectWorkspaceId, setProjectWorkspaceId] = useState('');
  const [projectRefresh, setProjectRefresh] = useState(0);
  const [contextOverview, setContextOverview] = useState<PlanningOverview | null>(null);
  useEffect(() => {
    let current = true;
    const initialRevision = workspaceRevision.current;
    void organizationApi
      .listWorkspaces()
      .then((items) => {
        if (!current) return;
        if (workspaceRevision.current !== initialRevision) {
          setWorkspaces((existing) => {
            const merged = [...items];
            for (const workspace of existing) {
              const index = merged.findIndex((item) => item.id === workspace.id);
              if (index < 0) merged.push(workspace);
              else merged[index] = workspace;
            }
            return merged;
          });
          return;
        }
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
      workspaceRevision.current += 1;
      setActiveWorkspaceId(id);
      localStorage.setItem('forge-active-workspace', id);
    }
    function onWorkspaceCreated(event: Event) {
      const workspace = (event as CustomEvent<{ workspace?: Workspace }>).detail?.workspace;
      if (workspace) {
        workspaceRevision.current += 1;
        setWorkspaces((items) => [...items.filter((item) => item.id !== workspace.id), workspace]);
      }
    }
    function onWorkspaceUpdated(event: Event) {
      const workspace = (event as CustomEvent<{ workspace?: Workspace }>).detail?.workspace;
      if (workspace) {
        workspaceRevision.current += 1;
        setWorkspaces((items) =>
          items.map((item) => (item.id === workspace.id ? workspace : item)),
        );
      }
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
    const nestedContext = context;
    if (!nestedContext?.epicId && !nestedContext?.featureId) {
      setContextOverview(null);
      return;
    }
    let current = true;
    void organizationApi
      .planningOverview(nestedContext.workspaceId, nestedContext.projectId)
      .then((overview) => {
        if (current) setContextOverview(overview);
      })
      .catch(() => {
        if (current) setContextOverview(null);
      });
    return () => {
      current = false;
    };
  }, [context?.epicId, context?.featureId, context?.projectId, context?.workspaceId]);
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
  const isMobileEpicBoard = /^\/planning\/[^/]+\/[^/]+\/epics\/[^/]+(?:\/|$)/.test(
    location.pathname,
  );
  const activeProject = context
    ? projects.find((project) => project.id === context.projectId)
    : null;
  const activeEpic = contextOverview?.epics.find(
    (epic) =>
      epic.id === context?.epicId ||
      epic.features.some((feature: { id: string }) => feature.id === context?.featureId),
  );
  const isPlanningContext = location.pathname.startsWith('/planning/');
  const isFeatureContext = Boolean(context?.featureId);
  const isEpicContext = Boolean(context?.epicId);
  const currentContextLabel = isFeatureContext
    ? 'WORK ITEM'
    : isEpicContext
      ? (activeEpic?.title ?? 'EPIC')
      : isPlanningContext
        ? 'EPICS'
        : 'OVERVIEW';
  const orderedProjects = [...projects].sort(
    (left, right) =>
      Number(right.id === context?.projectId) - Number(left.id === context?.projectId),
  );
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
      path: context ? `/projects/${context.workspaceId}/${context.projectId}` : '/',
    },
    { id: 'projects', label: 'Projects', path: '/' },
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
      <header
        className={`${styles.mobileHeader} ${isMobileEpicBoard ? styles.mobileEpicHeader : ''}`}
        aria-label="Workspace controls"
        data-node-id={isMobileEpicBoard ? '348:211' : undefined}
      >
        <Link to="/" className={styles.brand}>
          <span className={styles.mark}>F</span>
          {isMobileEpicBoard ? (activeProject?.name ?? 'FORGE ORG TOOL') : 'FORGE'}
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
          {isMobileEpicBoard ? '⌕' : 'Search'}
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
        <aside className={styles.sidebar} data-testid="app-sidebar" data-node-id="344:83">
          <Link to="/" className={styles.brand} data-node-id="344:84">
            <span className={styles.mark}>F</span>
            <span className={styles.brandName}>FORGE</span>
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
            dataNodeId="344:89"
          />
          {navigationError && (
            <p role="alert" className={styles.navigationError}>
              {navigationError}
            </p>
          )}
          {navigationWorkspaceId && (
            <nav aria-label="Project navigation" className={styles.projectNav}>
              <NavigationItem
                to="/"
                end
                label="Workspace Overview"
                aria-label="Workspace Overview"
              />
              <h2>Project</h2>
              {projectWorkspaceId !== navigationWorkspaceId ? (
                <span className={styles.emptyProjects}>Loading projects…</span>
              ) : projects.length === 0 ? (
                <span className={styles.emptyProjects}>No active projects</span>
              ) : (
                orderedProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${navigationWorkspaceId}/${project.id}`}
                    aria-current={context?.projectId === project.id ? 'page' : undefined}
                  >
                    <span className={styles.projectIcon} aria-hidden="true">
                      ◈
                    </span>
                    {project.name}
                  </Link>
                ))
              )}
            </nav>
          )}
          <div className={styles.localMode}>
            <strong>LOCAL FIRST&nbsp;&nbsp; • &nbsp;&nbsp;PRIVATE</strong>
          </div>
        </aside>
        <div
          className={styles.contentColumn}
          data-node-id={isMobileEpicBoard ? '348:215' : undefined}
        >
          <header
            className={styles.topbar}
            data-testid="app-topbar"
            data-node-id="344:105"
            aria-label="Application controls"
          >
            {context && (
              <nav
                className={styles.topbarContext}
                aria-label="Current location"
                data-node-id="344:106"
              >
                <Link to="/">{activeWorkspace?.name ?? 'Workspace'}</Link>
                <span aria-hidden="true">/</span>
                <Link to={`/projects/${context.workspaceId}/${context.projectId}`}>
                  {activeProject?.name ?? 'Project'}
                </Link>
                {isPlanningContext && (
                  <>
                    <span aria-hidden="true">/</span>
                    {isEpicContext || isFeatureContext ? (
                      <Link to={`/planning/${context.workspaceId}/${context.projectId}`}>
                        EPICS
                      </Link>
                    ) : (
                      <span aria-current="page">EPICS</span>
                    )}
                    {activeEpic && (
                      <>
                        <span aria-hidden="true">/</span>
                        {isFeatureContext ? (
                          <Link
                            to={`/planning/${context.workspaceId}/${context.projectId}/epics/${activeEpic.id}`}
                          >
                            {activeEpic.title}
                          </Link>
                        ) : (
                          <span aria-current="page">{activeEpic.title}</span>
                        )}
                      </>
                    )}
                    {isFeatureContext && (
                      <>
                        <span aria-hidden="true">/</span>
                        <span aria-current="page">{currentContextLabel}</span>
                      </>
                    )}
                  </>
                )}
                {!isPlanningContext && <span aria-current="page">{currentContextLabel}</span>}
              </nav>
            )}
            <div className={styles.topbarActions}>
              <Button
                variant="ghost"
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                data-node-id="344:107"
              >
                ⌕ Search
              </Button>
              <label className={styles.themeControl}>
                <select
                  aria-label="Appearance"
                  data-node-id="344:109"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as typeof theme)}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
                <span className={styles.themeLabel} aria-hidden="true">
                  ☀ / ☾
                </span>
              </label>
            </div>
          </header>
          <main
            id="main"
            className={styles.main}
            data-node-id={isMobileEpicBoard ? undefined : '344:81'}
          >
            <Breadcrumbs
              pathname={location.pathname}
              isMobileEpicBoard={isMobileEpicBoard}
              workspaceName={activeWorkspace?.name}
              projectName={activeProject?.name}
            />
            <Routes>
              <Route path="/" element={<OrganizationPage />} />
              <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
              <Route path="/projects/:workspaceId/:projectId" element={<ProjectOverviewPage />} />
              <Route
                path="/planning/:workspaceId/:projectId"
                element={<PlanningPage projectName={activeProject?.name} />}
              />
              <Route
                path="/planning/:workspaceId/:projectId/epics/:epicId"
                element={<EpicDetailPage />}
              />
              <Route
                path="/planning/:workspaceId/:projectId/features/:featureId"
                element={<FeatureDetailPage />}
              />
              <Route
                path="/transfer/:workspaceId/:projectId"
                element={
                  <TransferPage
                    projectName={activeProject?.name}
                    workspaceName={activeWorkspace?.name}
                  />
                }
              />
              <Route path="/transfer/workspaces/:workspaceId" element={<TransferPage />} />
              <Route
                path="/transfer/:workspaceId/:projectId/:scope/:destinationId"
                element={
                  <TransferPage
                    projectName={activeProject?.name}
                    workspaceName={activeWorkspace?.name}
                  />
                }
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
      <nav
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        data-node-id={isMobileEpicBoard ? '348:237' : undefined}
      >
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

function Breadcrumbs({
  pathname,
  isMobileEpicBoard,
  workspaceName,
  projectName,
}: {
  pathname: string;
  isMobileEpicBoard: boolean;
  workspaceName?: string;
  projectName?: string;
}) {
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
    { label: isMobileEpicBoard ? (workspaceName ?? 'Workspace') : 'Workspace', href: '/' },
    {
      label: isMobileEpicBoard ? (projectName ?? 'Project') : 'Project board',
      href: `/planning/${context.workspaceId}/${context.projectId}`,
    },
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
    <nav
      aria-label="Breadcrumb"
      className={`${styles.breadcrumb} ${isMobileEpicBoard ? styles.mobileEpicBreadcrumb : ''}`}
      data-node-id={isMobileEpicBoard ? '348:216' : undefined}
    >
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
  const epicId = section === 'planning' && fourth === 'epics' ? fifth : undefined;
  const featureId = section === 'planning' && fourth === 'features' ? fifth : undefined;
  return { workspaceId, projectId, epicId, featureId };
}
