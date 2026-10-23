import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  FormField,
  Input,
  SearchField,
  SectionHeader,
  StatusChip,
  Textarea,
} from '@forge-org/ui';
import styles from './OrganizationPage.module.css';
import { useOrganizationController } from './useOrganizationController';
import { ProjectCard } from '../planning/index';

export function OrganizationPage() {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const {
    activeProjects,
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
    setWorkspaceName,
    showArchived,
    toggleProject,
    visibleProjects,
    workspaceId,
    workspaceName,
    workspaceDescription,
    setWorkspaceDescription,
  } = useOrganizationController();
  const continueProject = projects.find((project) => project.status === 'active');

  async function submitProject(event: FormEvent) {
    if (await createProject(event)) setProjectDialogOpen(false);
  }

  return (
    <div className={styles.stack}>
      {loading ? (
        <Card>
          <p role="status">Loading Workspace…</p>
        </Card>
      ) : !selectedWorkspace ? (
        workspacesEmptyState(
          workspaceName,
          setWorkspaceName,
          workspaceDescription,
          setWorkspaceDescription,
          createWorkspace,
        )
      ) : null}
      {!loading && error && !selectedWorkspace && (
        <Card>
          <div role="alert" className={styles.error}>
            <p>{error}</p>
            <Button variant="secondary" onClick={() => void retryWorkspaces()}>
              Retry loading workspaces
            </Button>
          </div>
        </Card>
      )}
      {!loading && selectedWorkspace && (
        <>
          <SectionHeader
            title="Your workspace, in focus"
            eyebrow={selectedWorkspace.name}
            actions={
              <div className={styles.homeActions}>
                {!selectedWorkspace.archived_at && (
                  <Button onClick={() => setProjectDialogOpen(true)}>New project</Button>
                )}
                <Link to={`/workspaces/${workspaceId}/settings`}>Workspace settings</Link>
              </div>
            }
          />
          {selectedWorkspace.archived_at && (
            <Card>
              <StatusChip tone="warning">Archived Workspace</StatusChip>
              <p>This Workspace is archived. Restore it in settings to create projects.</p>
            </Card>
          )}
          {error && <p role="alert">{error}</p>}
          <section aria-label="Workspace summary" className={styles.summaryGrid}>
            <Summary
              label="Projects"
              value={projects.length}
              detail={`${activeProjects} active · ${archivedProjects} archived`}
            />
            <Summary
              label="Epics"
              value={dashboardSummaries.reduce((total, item) => total + item.epicCount, 0)}
              detail={dashboardLoading ? 'Loading project summaries' : 'Across active projects'}
            />
            <Summary
              label="Work items"
              value={dashboardSummaries.reduce((total, item) => total + item.featureCount, 0)}
              detail={dashboardLoading ? 'Loading project summaries' : 'Stories and Bugs'}
            />
          </section>
          <section aria-labelledby="projects-heading" className={styles.projectSection}>
            <header className={styles.projectToolbar}>
              <div>
                <h2 id="projects-heading">Projects</h2>
                <p>Open a project to continue with its Epic board.</p>
              </div>
              <div className={styles.projectFilters}>
                <SearchField
                  id="project-search"
                  aria-label="Search projects"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <div className={styles.archivedToggle}>
                  <Checkbox
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                    aria-label="Show archived"
                  />
                  <span>Show archived</span>
                </div>
                <Link to={`/transfer/workspaces/${workspaceId}`}>Import project</Link>
              </div>
            </header>
            {visibleProjects.length === 0 ? (
              <Card>
                {projects.length === 0 ? (
                  <div className={styles.empty}>
                    <h3>No projects yet</h3>
                    <p>Create a project to start organizing Epics and work items.</p>
                    {!selectedWorkspace.archived_at && (
                      <Button onClick={() => setProjectDialogOpen(true)}>
                        Create your first project
                      </Button>
                    )}
                  </div>
                ) : (
                  <p>No projects match this search and archive filter.</p>
                )}
              </Card>
            ) : (
              <div className={styles.projects}>
                {visibleProjects.map((project) => {
                  const summary = dashboardSummaries.find((item) => item.project.id === project.id);
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      workspaceId={workspaceId}
                      href={`/planning/${workspaceId}/${project.id}`}
                    >
                      <div className={styles.projectSummary} aria-label={`${project.name} summary`}>
                        {summary?.unavailable ? (
                          <span>Planning summary unavailable</span>
                        ) : summary ? (
                          <>
                            <span>{summary.epicCount} Epics</span>
                            <span>{summary.featureCount} work items</span>
                            <span>{summary.progress}% complete</span>
                          </>
                        ) : (
                          <span>
                            {dashboardLoading ? 'Loading summary…' : 'Summary unavailable'}
                          </span>
                        )}
                      </div>
                      <div className={styles.cardActions}>
                        <Link to={`/planning/${workspaceId}/${project.id}`}>Open Board</Link>
                        <Link to={`/projects/${workspaceId}/${project.id}`}>Overview</Link>
                        <Button variant="secondary" onClick={() => void toggleProject(project)}>
                          {project.status === 'active' ? 'Archive' : 'Restore'}
                        </Button>
                      </div>
                    </ProjectCard>
                  );
                })}
              </div>
            )}
          </section>
          {continueProject && (
            <section aria-labelledby="continue-working-heading" className={styles.continueWorking}>
              <h2 id="continue-working-heading">Continue working</h2>
              <p>Pick up where you left off in an active project.</p>
              <Link to={`/planning/${workspaceId}/${continueProject.id}`}>
                Open {continueProject.name}
              </Link>
            </section>
          )}
          <Dialog
            title="Create project"
            description="Give this project a name. You can add its Epics from the project board."
            open={projectDialogOpen}
            onClose={() => setProjectDialogOpen(false)}
          >
            <form onSubmit={(event) => void submitProject(event)} className={styles.form}>
              <FormField label="Project name">
                <Input
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setProjectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create project</Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <Card>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      <small>{detail}</small>
    </Card>
  );
}

function workspacesEmptyState(
  workspaceName: string,
  setWorkspaceName: (value: string) => void,
  workspaceDescription: string,
  setWorkspaceDescription: (value: string) => void,
  createWorkspace: (event: FormEvent) => void,
) {
  return (
    <Card>
      <StatusChip tone="warning">Getting started</StatusChip>
      <h2>No workspaces yet</h2>
      <p>Create a Workspace to organize projects and planning.</p>
      <form onSubmit={createWorkspace} className={styles.form} aria-label="Create first workspace">
        <FormField label="Workspace name">
          <Input
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
        <Button type="submit">Create Workspace</Button>
      </form>
    </Card>
  );
}
