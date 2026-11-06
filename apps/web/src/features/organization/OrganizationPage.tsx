import { type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  CheckboxV2,
  DialogV2,
  FeedbackStateV2,
  FormField,
  SearchField,
  TextInputV2,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from './OrganizationPage.module.css';
import { useOrganizationPage } from './useOrganizationPage';

export function OrganizationPage() {
  const {
    projectDialogOpen,
    setProjectDialogOpen,
    filtersOpen,
    setFiltersOpen,
    activeProjects,
    archivedProjects,
    createWorkspace,
    dashboardLoading,
    dashboardSummaries,
    error,
    loading,
    projectDescription,
    projectName,
    projects,
    retryWorkspaces,
    search,
    selectedWorkspace,
    setProjectDescription,
    setProjectName,
    setSearch,
    setShowArchived,
    setWorkspaceName,
    showArchived,
    toggleProject,
    visibleProjects,
    workspaceId,
    workspaceName,
    workspaceDescription,
    setWorkspaceDescription,
    recentEpics,
    submitProject,
  } = useOrganizationPage();

  if (loading)
    return (
      <CardV2>
        <FeedbackStateV2 state="loading" title="Loading Workspace…" />
      </CardV2>
    );
  if (!selectedWorkspace) {
    return (
      <div className={styles.stack}>
        {error && <AlertV2 tone="error">{error}</AlertV2>}
        <WorkspaceEmptyState
          workspaceName={workspaceName}
          setWorkspaceName={setWorkspaceName}
          workspaceDescription={workspaceDescription}
          setWorkspaceDescription={setWorkspaceDescription}
          createWorkspace={createWorkspace}
          retryWorkspaces={retryWorkspaces}
          error={error}
        />
      </div>
    );
  }

  const summaries = dashboardSummaries;
  const epicCount = summaries.reduce((total, item) => total + item.epicCount, 0);
  const workItemCount = summaries.reduce((total, item) => total + item.featureCount, 0);
  const activeWorkspaceProjects = projects.filter(
    (project) => project.workspace_id === workspaceId && project.status === 'active',
  );
  const visibleRecentEpics = recentEpics.filter(
    (epic) =>
      epic.workspaceId === workspaceId &&
      activeWorkspaceProjects.some((project) => project.id === epic.projectId),
  );

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeading}>
        <span className={styles.eyebrow}>WORKSPACE OVERVIEW</span>
        <h1>Your workspace, in focus</h1>
        <p>Pick up where you left off. Organize work without the noise.</p>
      </header>

      {error && (
        <AlertV2 tone="error" className={styles.pageError}>
          {error}
        </AlertV2>
      )}
      {selectedWorkspace.archived_at && (
        <CardV2 className={styles.archivedNotice}>
          <BadgeV2 tone="warning">Archived Workspace</BadgeV2>
          <p>This Workspace is archived. Restore it in settings to create projects.</p>
        </CardV2>
      )}

      <section aria-labelledby="projects-heading" className={styles.projectSection}>
        <header className={styles.projectToolbar}>
          <div className={styles.projectTitleGroup}>
            <h2 id="projects-heading">Projects</h2>
            <div className={styles.filterMenu}>
              <ButtonV2
                variant="ghost"
                size="sm"
                type="button"
                aria-label="Project filters"
                aria-expanded={filtersOpen}
                aria-controls="project-filter-options"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Filters
              </ButtonV2>
              {filtersOpen && (
                <div id="project-filter-options" className={styles.filterPopover}>
                  <SearchField
                    id="project-search"
                    aria-label="Search projects"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <div className={styles.archivedToggle}>
                    <CheckboxV2
                      checked={showArchived}
                      onChange={(event) => setShowArchived(event.target.checked)}
                      aria-label="Show archived"
                    />
                    <span>Show archived</span>
                  </div>
                  <Link to={`/workspaces/${workspaceId}/settings`}>Workspace settings</Link>
                  <p>
                    {activeProjects} active · {archivedProjects} archived
                  </p>
                </div>
              )}
            </div>
          </div>
          <Link className={styles.importAction} to={`/transfer/workspaces/${workspaceId}`}>
            Import Project
          </Link>
          {!selectedWorkspace.archived_at && (
            <ButtonV2
              className={styles.newProject}
              aria-label="New project"
              onClick={() => setProjectDialogOpen(true)}
            >
              + New Project
            </ButtonV2>
          )}
        </header>

        <section aria-label="Workspace summary" className={styles.summaryGrid}>
          <Summary label="Projects" value={activeProjects} detail="Active projects" />
          <Summary
            label="Epics"
            value={epicCount}
            detail={dashboardLoading ? 'Loading project summaries' : 'Across your projects'}
          />
          <Summary
            label="Work items"
            value={workItemCount}
            detail={dashboardLoading ? 'Loading project summaries' : 'Stories and Bugs'}
          />
        </section>

        {visibleProjects.length === 0 ? (
          <CardV2 className={styles.emptyProjects}>
            {projects.length === 0 ? (
              <>
                <h3>No projects yet</h3>
                <p>Create a project to start organizing Epics and work items.</p>
                {!selectedWorkspace.archived_at && (
                  <ButtonV2 onClick={() => setProjectDialogOpen(true)}>
                    Create your first project
                  </ButtonV2>
                )}
              </>
            ) : (
              <p>No projects match this search and archive filter.</p>
            )}
          </CardV2>
        ) : (
          <div className={styles.projects} aria-label="Projects">
            {visibleProjects.map((project) => {
              const summary = summaries.find((item) => item.project.id === project.id);
              return (
                <CardV2
                  as="article"
                  key={project.id}
                  className={styles.projectCard}
                  aria-label={project.name}
                  data-state={project.status === 'active' ? 'Active' : 'Archived'}
                >
                  <span className={styles.projectStatus}>
                    PROJECT &middot; {project.status.toUpperCase()}
                  </span>
                  <h3>
                    <Link to={`/planning/${workspaceId}/${project.id}`}>{project.name}</Link>
                  </h3>
                  <p className={styles.projectDescription}>
                    {project.description || 'No description'}
                  </p>
                  <p className={styles.projectSummary}>
                    {summary?.unavailable ? (
                      'Planning summary unavailable'
                    ) : summary ? (
                      <>
                        <span>{summary.epicCount} Epics</span>
                        <span>{summary.featureCount} work items</span>
                      </>
                    ) : dashboardLoading ? (
                      'Loading project summary…'
                    ) : (
                      'Summary unavailable'
                    )}
                  </p>
                  <details className={styles.projectActions}>
                    <summary>Project actions</summary>
                    <div>
                      <Link to={`/planning/${workspaceId}/${project.id}`}>Open Board</Link>
                      <Link to={`/projects/${workspaceId}/${project.id}`}>Overview</Link>
                      <ButtonV2 variant="secondary" onClick={() => void toggleProject(project)}>
                        {project.status === 'active' ? 'Archive' : 'Restore'}
                      </ButtonV2>
                    </div>
                  </details>
                </CardV2>
              );
            })}
          </div>
        )}

        {activeWorkspaceProjects.length > 0 && !selectedWorkspace.archived_at && (
          <section
            aria-labelledby="continue-working-heading"
            aria-label="Continue working"
            className={styles.continueWorking}
          >
            <h2 id="continue-working-heading">Continue working</h2>
            <div className={styles.recentItems}>
              {visibleRecentEpics.length > 0
                ? visibleRecentEpics.map((epic) => {
                    const { projectId } = epic;
                    const project = projects.find((item) => item.id === projectId);
                    return (
                      <Link
                        aria-label={epic.title}
                        className={styles.recentItem}
                        key={epic.id}
                        to={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                      >
                        <strong>{epic.title}</strong>
                        <span>
                          {project?.name ?? selectedWorkspace.name} &middot; {epic.workItems}{' '}
                          {epic.workItems === 1 ? 'work item' : 'work items'}
                        </span>
                      </Link>
                    );
                  })
                : activeWorkspaceProjects.slice(0, 2).map((project) => {
                    const summary = summaries.find((item) => item.project.id === project.id);
                    return (
                      <Link
                        className={styles.recentItem}
                        key={project.id}
                        to={`/planning/${workspaceId}/${project.id}`}
                      >
                        <strong>{project.name}</strong>
                        <span>
                          {project.name} &middot;{' '}
                          {summary && !summary.unavailable
                            ? `${summary.featureCount} work items`
                            : 'Open project board'}
                        </span>
                      </Link>
                    );
                  })}
            </div>
          </section>
        )}
      </section>

      <DialogV2
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setProjectDialogOpen(false);
        }}
        title="Create project"
        description="Give this project a name. You can add its Epics from the project board."
        open={projectDialogOpen}
      >
        {error && <AlertV2 tone="error">{error}</AlertV2>}
        <form onSubmit={(event) => void submitProject(event)} className={styles.form}>
          <FormField label="Project name">
            <TextInputV2
              aria-label="Project name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              aria-label="Project description"
              rows={3}
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
            />
          </FormField>
          <div className={styles.formActions}>
            <ButtonV2 type="button" variant="secondary" onClick={() => setProjectDialogOpen(false)}>
              Cancel
            </ButtonV2>
            <ButtonV2 type="submit">Create project</ButtonV2>
          </div>
        </form>
      </DialogV2>
    </div>
  );
}

function Summary({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <CardV2 className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{String(value).padStart(2, '0')}</strong>
      <small>{detail}</small>
    </CardV2>
  );
}

function WorkspaceEmptyState({
  workspaceName,
  setWorkspaceName,
  workspaceDescription,
  setWorkspaceDescription,
  createWorkspace,
  retryWorkspaces,
  error,
}: {
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  workspaceDescription: string;
  setWorkspaceDescription: (value: string) => void;
  createWorkspace: (event: FormEvent) => void;
  retryWorkspaces: () => void;
  error: string;
}) {
  return (
    <CardV2 className={styles.emptyState}>
      <BadgeV2 tone="warning">Getting started</BadgeV2>
      <h1>No workspaces yet</h1>
      <p>Create a Workspace to organize projects and planning.</p>
      {error && (
        <ButtonV2 variant="secondary" onClick={() => void retryWorkspaces()}>
          Retry loading workspaces
        </ButtonV2>
      )}
      <form onSubmit={createWorkspace} className={styles.form} aria-label="Create first workspace">
        <FormField label="Workspace name">
          <TextInputV2
            aria-label="Workspace name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Workspace description">
          <Textarea
            aria-label="Workspace description"
            rows={3}
            value={workspaceDescription}
            onChange={(event) => setWorkspaceDescription(event.target.value)}
          />
        </FormField>
        <ButtonV2 type="submit">Create Workspace</ButtonV2>
      </form>
    </CardV2>
  );
}
