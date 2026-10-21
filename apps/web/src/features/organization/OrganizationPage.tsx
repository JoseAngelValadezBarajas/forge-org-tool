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
    archivedProjects,
    createProject,
    createWorkspace,
    error,
    loading,
    projectDescription,
    projectName,
    projects,
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
          <p role="alert">{error}</p>
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
            {projects.length === 0 ? (
              <p>No matching projects.</p>
            ) : (
              <div className={styles.projects}>
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} workspaceId={workspaceId}>
                    <p>
                      <Link to={`/repositories/${workspaceId}/${project.id}`}>Repositories</Link> ·{' '}
                      <Link to={`/workbench/${workspaceId}/${project.id}`}>Workbench</Link> ·{' '}
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
        </>
      )}
    </div>
  );
}
