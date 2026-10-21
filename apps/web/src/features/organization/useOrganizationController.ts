import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { organizationApi, type Project, type Workspace } from '@forge-org/api-client';

export function useOrganizationController() {
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

  const loadWorkspaces = useCallback(async (isCurrent: () => boolean = () => true) => {
    setLoading(true);
    setError('');
    try {
      const next = await organizationApi.listWorkspaces();
      if (!isCurrent()) return;
      setWorkspaces(next);
      setWorkspaceId((current) =>
        next.some((item) => item.id === current) ? current : (next[0]?.id ?? ''),
      );
    } catch (cause) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  const loadProjects = useCallback(
    async (id: string, isCurrent: () => boolean = () => true) => {
      if (!id) {
        if (isCurrent()) setProjects([]);
        return;
      }
      try {
        const next = await organizationApi.listProjects(
          id,
          search,
          showArchived ? 'all' : 'active',
        );
        if (isCurrent()) setProjects(next);
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load projects.');
        }
      }
    },
    [search, showArchived],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void loadWorkspaces(() => current));
    return () => {
      current = false;
    };
  }, [loadWorkspaces]);

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void loadProjects(workspaceId, () => current));
    return () => {
      current = false;
    };
  }, [loadProjects, workspaceId]);

  async function createWorkspace(event: FormEvent) {
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

  async function createProject(event: FormEvent) {
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

  return {
    activeProjects,
    archivedProjects,
    createProject,
    createWorkspace,
    error,
    loadProjects,
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
  };
}
