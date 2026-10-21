import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  FormField,
  Input,
  SearchField,
  SectionHeader,
  Select,
  StatusChip,
} from '@forge-org/ui';
import { organizationApi, type Project, type Workspace } from '@forge-org/api-client';
import styles from './OrganizationPage.module.css';

export function OrganizationPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const selectedWorkspace = workspaces.find((item) => item.id === workspaceId);
  const activeProjects = projects.filter((item) => item.status === 'active').length;
  const archivedProjects = projects.filter((item) => item.status !== 'active').length;

  async function loadWorkspaces() {
    setLoading(true);
    setError('');
    try {
      const next = await organizationApi.listWorkspaces();
      setWorkspaces(next);
      setWorkspaceId((current) =>
        next.some((item) => item.id === current) ? current : (next[0]?.id ?? ''),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects(id: string) {
    if (!id) {
      setProjects([]);
      return;
    }
    try {
      setProjects(await organizationApi.listProjects(id, search, showArchived ? 'all' : 'active'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load projects.');
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);
  useEffect(() => {
    void loadProjects(workspaceId);
  }, [workspaceId, search, showArchived]);

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    try {
      const created = await organizationApi.createWorkspace(workspaceName);
      setWorkspaceName('');
      setWorkspaces((items) => [...items, created]);
      setWorkspaceId(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workspace.');
    }
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    if (!workspaceId || !projectName.trim()) return;
    try {
      await organizationApi.createProject(workspaceId, projectName, projectDescription);
      setProjectName('');
      setProjectDescription('');
      await loadProjects(workspaceId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create project.');
    }
  }

  async function toggleProject(project: Project) {
    try {
      await organizationApi.setProjectStatus(
        workspaceId,
        project.id,
        project.status === 'active' ? 'archived' : 'active',
      );
      await loadProjects(workspaceId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update project.');
    }
  }

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
              <FormField label="Workspace">
                <Select
                  id="workspace-select"
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </Select>
              </FormField>
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
                  <article key={project.id} className={styles.project}>
                    <div>
                      <StatusChip tone={project.status === 'active' ? 'success' : 'neutral'}>
                        {project.status}
                      </StatusChip>
                      <h3>
                        <Link to={`/planning/${workspaceId}/${project.id}`}>{project.name}</Link>
                      </h3>
                      <p>
                        <Link to={`/repositories/${workspaceId}/${project.id}`}>Repositories</Link>{' '}
                        · <Link to={`/workbench/${workspaceId}/${project.id}`}>Workbench</Link> ·{' '}
                        <Link to={`/delivery/${workspaceId}/${project.id}`}>Delivery</Link> ·{' '}
                        <Link to={`/transfer/${workspaceId}/${project.id}`}>Transfer</Link>
                      </p>
                      {project.description && <p>{project.description}</p>}
                    </div>
                    <Button variant="secondary" onClick={() => void toggleProject(project)}>
                      {project.status === 'active' ? 'Archive' : 'Restore'}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
