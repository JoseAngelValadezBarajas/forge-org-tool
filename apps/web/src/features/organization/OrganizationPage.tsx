import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  FormField,
  Input,
  SearchField,
  SectionHeader,
  StatusChip,
} from '@forge-org/ui';
import styles from './OrganizationPage.module.css';
import { useOrganizationController } from './useOrganizationController';
import { ProjectCard } from '../planning/index';
import { WorkspaceSwitcher } from '../../app/shell/index';

export function OrganizationPage() {
  const {
    activeProjects,
    activity,
    activityState,
    archivedProjects,
    createProject,
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
    setWorkspaceId,
    setWorkspaceName,
    showArchived,
    toggleProject,
    visibleProjects,
    workspaceId,
    workspaceName,
    workspaces,
  } = useOrganizationController();

  return (
    <div className={styles.stack}>
      <SectionHeader title="Organization" eyebrow="FORGE / Workspaces" />
      {error && (
        <Card>
          <StatusChip tone="danger">Error</StatusChip>
          <div role="alert" className={styles.error}>
            <p>{error}</p>
            <Button variant="secondary" onClick={() => void retryWorkspaces()}>
              Retry loading workspaces
            </Button>
          </div>
        </Card>
      )}
      {loading ? (
        <Card>
          <p>Loading workspaces…</p>
        </Card>
      ) : workspaces.length === 0 ? (
        <Card>
          <StatusChip tone="warning">Getting started</StatusChip>
          <h3>No workspaces yet</h3>
          <p>Create a workspace to organize projects and keep the next decision visible.</p>
          <form onSubmit={createWorkspace} className={styles.form}>
            <FormField label="Workspace name">
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                required
              />
            </FormField>
            <Button type="submit">Create Workspace</Button>
          </form>
        </Card>
      ) : (
        <>
          <div className={styles.summaryGrid} aria-label="Workspace summary">
            <Card>
              <span className={styles.metricLabel}>Projects</span>
              <strong className={styles.metricValue}>{projects.length}</strong>
              <small>{projects.length} total</small>
            </Card>
            <Card>
              <span className={styles.metricLabel}>Active</span>
              <strong className={styles.metricValue}>{activeProjects}</strong>
              <small>currently active</small>
            </Card>
            <Card>
              <span className={styles.metricLabel}>Archived</span>
              <strong className={styles.metricValue}>{archivedProjects}</strong>
              <small>kept for history</small>
            </Card>
            <Card>
              <span className={styles.metricLabel}>Workspace</span>
              <strong className={styles.metricValue}>{selectedWorkspace?.name ?? 'Local'}</strong>
              <small>private local mode</small>
            </Card>
          </div>
          <section className={styles.dashboard} aria-labelledby="project-summaries-heading">
            <h2 id="project-summaries-heading">Project summaries</h2>
            {dashboardLoading ? (
              <p role="status">Loading project summaries and current readiness…</p>
            ) : dashboardSummaries.length === 0 ? (
              <p>No active projects to summarize.</p>
            ) : (
              <div className={styles.summaryProjects}>
                {dashboardSummaries.map((summary) => (
                  <Card key={summary.project.id}>
                    <h3>
                      <Link to={`/projects/${workspaceId}/${summary.project.id}`}>
                        {summary.project.name}
                      </Link>
                    </h3>
                    {summary.unavailable ? (
                      <p>Planning summary is unavailable right now.</p>
                    ) : (
                      <>
                        <p>{summary.featureCount} planned features</p>
                        <p>
                          Manual planning:{' '}
                          {Object.entries(summary.statusCounts)
                            .map(([status, count]) => `${status} ${count}`)
                            .join(' · ') || 'no features yet'}
                        </p>
                        <p>
                          Readiness evaluation preview: {summary.readiness.ready} ready to start ·{' '}
                          {summary.readiness.notReady} not ready · {summary.readiness.unavailable}{' '}
                          unavailable
                        </p>
                        {summary.attention.length > 0 && (
                          <div>
                            <h4>Needs attention</h4>
                            <ul>
                              {summary.attention.map((item) => (
                                <li key={`${item.featureId}-${item.code}`}>
                                  <Link
                                    to={`/planning/${workspaceId}/${summary.project.id}/features/${item.featureId}`}
                                  >
                                    {item.featureTitle}
                                  </Link>
                                  : {item.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
          <Card>
            <div className={styles.toolbar}>
              <WorkspaceSwitcher
                value={workspaceId}
                workspaces={workspaces}
                onChange={setWorkspaceId}
                currentName={selectedWorkspace?.name ?? 'Local Workspace'}
              />
            </div>
            <form onSubmit={createProject} className={styles.form}>
              <h3>Create project</h3>
              <FormField label="Project name">
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  required
                />
              </FormField>
              <FormField label="Description">
                <Input
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                />
              </FormField>
              <Button type="submit">Create Project</Button>
            </form>
          </Card>
          <Card>
            <div className={styles.toolbar}>
              <h3>Projects</h3>
              <SearchField
                id="project-search"
                aria-label="Search projects"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Checkbox
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                aria-label="Show archived"
              />{' '}
              <span>Show archived</span>
            </div>
            {visibleProjects.length === 0 ? (
              <p>
                {projects.length === 0
                  ? 'No projects in this workspace yet.'
                  : 'No matching projects.'}
              </p>
            ) : (
              <div className={styles.projects}>
                {visibleProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} workspaceId={workspaceId}>
                    <p>
                      <Link to={`/planning/${workspaceId}/${project.id}`}>Open planning board</Link>{' '}
                      · <Link to={`/repositories/${workspaceId}/${project.id}`}>Repositories</Link>{' '}
                      · <Link to={`/workbench/${workspaceId}/${project.id}`}>Workbench</Link> ·{' '}
                      <Link to={`/delivery/${workspaceId}/${project.id}`}>Delivery</Link> ·{' '}
                      <Link to={`/transfer/${workspaceId}/${project.id}`}>Transfer</Link>
                    </p>
                    <Button variant="secondary" onClick={() => void toggleProject(project)}>
                      {project.status === 'active' ? 'Archive' : 'Restore'}
                    </Button>
                  </ProjectCard>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2>Recent activity</h2>
            {activityState === 'loading' ? (
              <p role="status">Loading recent activity…</p>
            ) : activityState === 'error' ? (
              <p role="alert">Recent activity could not be loaded.</p>
            ) : activity.length === 0 ? (
              <p>No recent activity for this workspace.</p>
            ) : (
              <ul className={styles.activityList}>
                {activity.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.kind === 'run' ? 'Reported run' : 'Handoff status'}</strong>
                      <span>{item.title}</span>
                      <small>
                        {item.projectName} · {item.status}
                      </small>
                    </div>
                    <time dateTime={item.occurredAt}>
                      {Number.isNaN(Date.parse(item.occurredAt))
                        ? item.occurredAt
                        : new Intl.DateTimeFormat(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(item.occurredAt))}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
