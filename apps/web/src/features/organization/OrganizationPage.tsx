import { useEffect, useState } from 'react';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
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

  async function loadWorkspaces() {
    setLoading(true); setError('');
    try {
      const next = await organizationApi.listWorkspaces();
      setWorkspaces(next);
      setWorkspaceId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.'); }
    finally { setLoading(false); }
  }

  async function loadProjects(id: string) {
    if (!id) { setProjects([]); return; }
    try { setProjects(await organizationApi.listProjects(id, search, showArchived ? 'all' : 'active')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load projects.'); }
  }

  useEffect(() => { void loadWorkspaces(); }, []);
  useEffect(() => { void loadProjects(workspaceId); }, [workspaceId, search, showArchived]);

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault(); if (!workspaceName.trim()) return;
    try { const created = await organizationApi.createWorkspace(workspaceName); setWorkspaceName(''); setWorkspaces((items) => [...items, created]); setWorkspaceId(created.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create workspace.'); }
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault(); if (!workspaceId || !projectName.trim()) return;
    try { await organizationApi.createProject(workspaceId, projectName, projectDescription); setProjectName(''); setProjectDescription(''); await loadProjects(workspaceId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create project.'); }
  }

  async function toggleProject(project: Project) {
    try { await organizationApi.setProjectStatus(workspaceId, project.id, project.status === 'active' ? 'archived' : 'active'); await loadProjects(workspaceId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update project.'); }
  }

  return <div className={styles.stack}>
    <SectionHeader title="Organization" eyebrow="FORGE / Workspaces" />
    {error && <Card><StatusChip tone="danger">Error</StatusChip><p role="alert">{error}</p></Card>}
    {loading ? <Card><p>Loading workspaces…</p></Card> : workspaces.length === 0 ? <Card>
      <StatusChip tone="warning">Getting started</StatusChip><h3>No workspaces yet</h3><p>Create a workspace to organize projects and keep the next decision visible.</p>
      <form onSubmit={createWorkspace} className={styles.form}><label htmlFor="workspace-name">Workspace name</label><Input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required /><Button type="submit">Create Workspace</Button></form>
    </Card> : <>
      <Card><div className={styles.toolbar}><label htmlFor="workspace-select">Workspace</label><select id="workspace-select" value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></div>
        <form onSubmit={createProject} className={styles.form}><h3>Create project</h3><label htmlFor="project-name">Project name</label><Input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} required /><label htmlFor="project-description">Description</label><Input id="project-description" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} /><Button type="submit">Create Project</Button></form>
      </Card>
      <Card><div className={styles.toolbar}><h3>Projects</h3><label htmlFor="project-search">Search</label><Input id="project-search" aria-label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} /><label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label></div>
        {projects.length === 0 ? <p>No matching projects.</p> : <div className={styles.projects}>{projects.map((project) => <article key={project.id} className={styles.project}><div><StatusChip tone={project.status === 'active' ? 'success' : 'neutral'}>{project.status}</StatusChip><h3>{project.name}</h3>{project.description && <p>{project.description}</p>}</div><Button variant="secondary" onClick={() => void toggleProject(project)}>{project.status === 'active' ? 'Archive' : 'Restore'}</Button></article>)}</div>}
      </Card>
    </>}
  </div>;
}
