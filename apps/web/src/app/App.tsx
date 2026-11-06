import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  AlertV2,
  ButtonV2,
  DropdownMenuV2,
  SearchField,
  SelectV2,
  ThemeScope,
  TooltipV2,
} from '@corefoundry-labs/forge-ui';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Layers,
  PanelLeft,
  PanelRight,
  Search,
  Settings,
} from '@corefoundry-labs/forge-icons';
import {
  OrganizationPage,
  ProjectOverviewPage,
  StorageSettingsPage,
  WorkspaceManagementPage,
  WorkspaceSettingsPage,
} from '../features/organization';
import { EpicDetailPage, FeatureDetailPage, PlanningPage } from '../features/planning';
import { TransferPage } from '../features/transfer';
import { CommandPalette, NavigationItem, WorkspaceSwitcher } from './shell';
import { ThemeProvider } from './theme';
import styles from './App.module.css';
import { Breadcrumbs } from './shell/Breadcrumbs';
import { storageProviderLabel } from './shell/navigationContext';
import { useApplicationShell } from './shell/useApplicationShell';

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
  const {
    paletteOpen,
    setPaletteOpen,
    workspaces,
    projects,
    navigationError,
    projectWorkspaceId,
    projectsExpanded,
    setProjectsExpanded,
    projectSearchOpen,
    setProjectSearchOpen,
    projectQuery,
    setProjectQuery,
    sidebarCollapsed,
    setSidebarCollapsed,
    storageSnapshot,
    configuredStorageProviders,
    storageRevision,
    location,
    context,
    navigationWorkspaceId,
    activeWorkspace,
    workspaceFallbackName,
    isMobileEpicBoard,
    activeProject,
    activeEpic,
    isPlanningContext,
    isFeatureContext,
    isEpicContext,
    currentContextLabel,
    filteredProjects,
    mobileWorkspaceId,
    mobileBoardPath,
    productDestinations,
    theme,
    resolvedTheme,
    forgeTheme,
    setTheme,
    go,
    selectStorageProvider,
    selectWorkspace,
  } = useApplicationShell();
  return (
    <ThemeScope
      theme={forgeTheme}
      className={styles.app}
      data-testid="application-shell"
      data-theme={resolvedTheme}
    >
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
            onManage={() => go('/workspaces/manage')}
            currentName={activeWorkspace?.name ?? workspaceFallbackName}
          />
        </div>
        <ButtonV2 variant="ghost" onClick={() => setPaletteOpen(true)} aria-label="Search">
          {isMobileEpicBoard ? '⌕' : 'Search'}
        </ButtonV2>
        <label className={`${styles.themeControl} ${styles.mobileTheme}`}>
          Appearance{' '}
          <SelectV2
            size="sm"
            value={theme}
            onChange={(event) => setTheme(event.target.value as typeof theme)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
            <option value="high-contrast">High contrast</option>
          </SelectV2>
        </label>
      </header>
      <div
        className={styles.shellGrid}
        data-testid="app-shell-grid"
        data-sidebar-collapsed={String(sidebarCollapsed)}
      >
        <aside
          id="app-sidebar"
          className={styles.sidebar}
          data-testid="app-sidebar"
          data-node-id="344:83"
        >
          <div className={styles.sidebarHeader}>
            <Link to="/" className={styles.brand} data-node-id="344:84">
              <span className={styles.mark}>F</span>
              <span className={styles.brandName}>FORGE</span>
            </Link>
            <TooltipV2
              content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              placement="right"
            >
              <button
                type="button"
                className={styles.sidebarToggle}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-controls="app-sidebar"
                aria-expanded={!sidebarCollapsed}
                data-testid="sidebar-toggle"
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              >
                {sidebarCollapsed ? (
                  <PanelRight aria-hidden="true" size={16} />
                ) : (
                  <PanelLeft aria-hidden="true" size={16} />
                )}
              </button>
            </TooltipV2>
          </div>
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
            onManage={() => go('/workspaces/manage')}
            currentName={activeWorkspace?.name ?? workspaceFallbackName}
            dataNodeId="344:89"
            compact={sidebarCollapsed}
          />
          {navigationError && (
            <AlertV2 tone="error" className={styles.navigationError}>
              {navigationError}
            </AlertV2>
          )}
          {navigationWorkspaceId && (
            <nav aria-label="Project navigation" className={styles.projectNav}>
              <NavigationItem
                to="/"
                end
                label="Workspace Overview"
                aria-label="Workspace Overview"
                icon={<Folder aria-hidden="true" size={16} />}
                title="Workspace Overview"
              />
              <div className={styles.projectSectionControls}>
                <h2>Project</h2>
                <button
                  type="button"
                  className={styles.projectSectionButton}
                  aria-label="Open project search"
                  aria-expanded={projectSearchOpen}
                  onClick={() => setProjectSearchOpen((open) => !open)}
                >
                  <Search aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  className={styles.projectSectionButton}
                  aria-label={projectsExpanded ? 'Collapse projects' : 'Expand projects'}
                  aria-expanded={projectsExpanded}
                  onClick={() => setProjectsExpanded((expanded) => !expanded)}
                >
                  {projectsExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </button>
              </div>
              {projectSearchOpen && (
                <SearchField
                  aria-label="Search projects"
                  className={styles.projectSearch}
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.currentTarget.value)}
                  placeholder="Search projects"
                  clearLabel="Clear project search"
                  onClear={() => setProjectQuery('')}
                />
              )}
              {projectsExpanded && (
                <div className={styles.projectList}>
                  {projectWorkspaceId !== navigationWorkspaceId ? (
                    <span className={styles.emptyProjects}>Loading projects…</span>
                  ) : projects.length === 0 ? (
                    <span className={styles.emptyProjects}>No active projects</span>
                  ) : filteredProjects.length === 0 ? (
                    <span className={styles.emptyProjects}>No matching projects</span>
                  ) : (
                    filteredProjects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/projects/${navigationWorkspaceId}/${project.id}`}
                        aria-current={context?.projectId === project.id ? 'page' : undefined}
                        title={project.name}
                      >
                        <span className={styles.projectIcon} aria-hidden="true">
                          <Layers aria-hidden="true" size={16} />
                        </span>
                        <span className={styles.projectLabel} data-navigation-label="true">
                          {project.name}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </nav>
          )}
          <div className={styles.localMode}>
            <DropdownMenuV2
              aria-label="Storage providers"
              placement="top"
              density="comfortable"
              trigger={
                <button
                  type="button"
                  className={styles.storageMenuTrigger}
                  aria-label={`Storage providers: ${storageProviderLabel(storageSnapshot)}`}
                >
                  <Settings aria-hidden="true" size={15} />
                  <span className={styles.storageMenuLabel}>
                    {storageProviderLabel(storageSnapshot)}
                  </span>
                  <ChevronDown aria-hidden="true" size={14} className={styles.storageMenuChevron} />
                </button>
              }
              items={[
                {
                  id: 'configure-storage',
                  label: 'Configure storage',
                  icon: <Settings aria-hidden="true" size={15} />,
                  onSelect: () => go('/settings/storage'),
                },
                { type: 'separator', id: 'storage-separator' },
                ...configuredStorageProviders.map((provider) => ({
                  id: `storage-${provider}`,
                  label: `${provider === 'local' ? 'Local SQLite' : 'Supabase'}${
                    storageSnapshot.provider === provider ? ' (active)' : ''
                  }`,
                  onSelect: () => selectStorageProvider(provider),
                })),
              ]}
            />
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
              <ButtonV2
                variant="ghost"
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                data-node-id="344:107"
              >
                ⌕ Search
              </ButtonV2>
              <div className={styles.themeControl}>
                <SelectV2
                  size="sm"
                  aria-label="Appearance"
                  data-node-id="344:109"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as typeof theme)}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                  <option value="high-contrast">High contrast</option>
                </SelectV2>
              </div>
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
            <Routes key={storageRevision}>
              <Route path="/" element={<OrganizationPage />} />
              <Route path="/settings/storage" element={<StorageSettingsPage />} />
              <Route path="/workspaces/manage" element={<WorkspaceManagementPage />} />
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
        <ButtonV2 variant="ghost" onClick={() => setPaletteOpen(true)} aria-label="Search">
          Search
        </ButtonV2>
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
          {
            id: 'storage-settings',
            label: 'Storage settings',
            onSelect: () => go('/settings/storage'),
          },
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
    </ThemeScope>
  );
}
