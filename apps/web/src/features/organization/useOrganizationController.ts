import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { organizationApi, type Project, type Workspace } from '@forge-org/api-client';

const ACTIVE_WORKSPACE_KEY = 'forge-active-workspace';

type ProjectDashboardSummary = {
  project: Project;
  featureCount: number;
  statusCounts: Record<string, number>;
  unavailable: boolean;
};

export function useOrganizationController() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [workspaceEditName, setWorkspaceEditName] = useState('');
  const [workspaceEditDescription, setWorkspaceEditDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardSummaries, setDashboardSummaries] = useState<ProjectDashboardSummary[]>([]);

  const selectedWorkspace = workspaces.find((item) => item.id === workspaceId);
  const activeProjects = projects.filter((item) => item.status === 'active').length;
  const archivedProjects = projects.filter((item) => item.status !== 'active').length;
  const visibleProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = [project.name, project.description ?? ''].some((value) =>
      value.toLowerCase().includes(query),
    );
    const matchesStatus = showArchived || project.status === 'active';
    return matchesSearch && matchesStatus;
  });

  const loadWorkspaces = useCallback(async (isCurrent: () => boolean = () => true) => {
    setLoading(true);
    setError('');
    try {
      const next = await organizationApi.listWorkspaces();
      if (!isCurrent()) return;
      setWorkspaces(next);
      const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? '';
      const selected = next.some((item) => item.id === saved) ? saved : (next[0]?.id ?? '');
      setWorkspaceId(selected);
      const selectedItem = next.find((item) => item.id === selected);
      setWorkspaceEditName(selectedItem?.name ?? '');
      setWorkspaceEditDescription(selectedItem?.description ?? '');
      if (selected) localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected);
      else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    } catch (cause) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  const selectWorkspace = useCallback(
    (id: string) => {
      setWorkspaceId(id);
      const selected = workspaces.find((item) => item.id === id);
      setWorkspaceEditName(selected?.name ?? '');
      setWorkspaceEditDescription(selected?.description ?? '');
      if (id) localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
      else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    },
    [workspaces],
  );

  const loadProjects = useCallback(async (id: string, isCurrent: () => boolean = () => true) => {
    if (!id) {
      if (isCurrent()) setProjects([]);
      return;
    }
    try {
      const next = await organizationApi.listProjects(id, '', 'all');
      if (isCurrent()) setProjects(next);
    } catch (cause) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : 'Unable to load projects.');
      }
    }
  }, []);

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

  useEffect(() => {
    let current = true;
    const activeProjects = projects.filter(
      (project) => project.workspace_id === workspaceId && project.status === 'active',
    );
    queueMicrotask(() => {
      if (current) setDashboardLoading(activeProjects.length > 0);
      if (activeProjects.length === 0) {
        if (current) setDashboardSummaries([]);
        return;
      }
      void Promise.all(
        activeProjects.map(async (project): Promise<ProjectDashboardSummary> => {
          try {
            const overview = await organizationApi.planningOverview(workspaceId, project.id);
            const features = overview.epics
              .flatMap((epic) => epic.features)
              .concat(overview.unassigned_features);
            const statusCounts: Record<string, number> = {};
            for (const feature of features) {
              statusCounts[feature.status] = (statusCounts[feature.status] ?? 0) + 1;
            }
            return {
              project,
              featureCount: features.length,
              statusCounts,
              unavailable: false,
            };
          } catch {
            return {
              project,
              featureCount: 0,
              statusCounts: {},
              unavailable: true,
            };
          }
        }),
      )
        .then((summaries) => {
          if (current) setDashboardSummaries(summaries);
        })
        .finally(() => {
          if (current) setDashboardLoading(false);
        });
    });
    return () => {
      current = false;
    };
  }, [projects, workspaceId]);

  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    try {
      const created = await organizationApi.createWorkspace(workspaceName, workspaceDescription);
      setWorkspaceName('');
      setWorkspaceDescription('');
      setWorkspaces((items) => [...items, created]);
      selectWorkspace(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workspace.');
    }
  }

  async function updateWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!selectedWorkspace || !workspaceEditName.trim()) return;
    try {
      const updated = await organizationApi.updateWorkspace(selectedWorkspace.id, {
        name: workspaceEditName.trim(),
        description: workspaceEditDescription.trim() || null,
      });
      setWorkspaces((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update workspace.');
    }
  }

  async function toggleWorkspaceArchive() {
    if (!selectedWorkspace) return;
    try {
      const updated = await organizationApi.setWorkspaceStatus(
        selectedWorkspace.id,
        !selectedWorkspace.archived_at,
      );
      setWorkspaces((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update workspace.');
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
    dashboardLoading,
    dashboardSummaries,
    error,
    loadProjects,
    loading,
    projectDescription,
    projectName,
    projects,
    retryWorkspaces: () => loadWorkspaces(),
    search,
    selectedWorkspace,
    setProjectDescription,
    setProjectName,
    setSearch,
    setShowArchived,
    setWorkspaceId: selectWorkspace,
    setWorkspaceName,
    showArchived,
    toggleProject,
    toggleWorkspaceArchive,
    visibleProjects,
    workspaceId,
    workspaceName,
    workspaceDescription,
    setWorkspaceDescription,
    workspaceEditName,
    setWorkspaceEditName,
    workspaceEditDescription,
    setWorkspaceEditDescription,
    updateWorkspace,
    workspaces,
  };
}
