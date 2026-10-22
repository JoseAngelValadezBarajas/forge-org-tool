import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type Feature,
  type Handoff,
  type Project,
  type Run,
  type Workspace,
} from '@forge-org/api-client';

type ProjectDashboardSummary = {
  project: Project;
  featureCount: number;
  statusCounts: Record<string, number>;
  readiness: { ready: number; notReady: number; unavailable: number };
  attention: Array<{ featureId: string; featureTitle: string; code: string; message: string }>;
  unavailable: boolean;
};

type ActivityItem = {
  id: string;
  kind: 'run' | 'handoff';
  title: string;
  status: string;
  occurredAt: string;
  projectName: string;
};

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
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardSummaries, setDashboardSummaries] = useState<ProjectDashboardSummary[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityState, setActivityState] = useState<'loading' | 'loaded' | 'error'>('loading');

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
            const features: Feature[] = overview.epics
              .flatMap((epic) => epic.features)
              .concat(overview.unassigned_features);
            const readinessResults = await Promise.all(
              features.map(async (feature) => {
                try {
                  return await organizationApi.previewReadiness(
                    workspaceId,
                    project.id,
                    feature.id,
                  );
                } catch {
                  return null;
                }
              }),
            );
            const statusCounts: Record<string, number> = {};
            for (const feature of features) {
              statusCounts[feature.status] = (statusCounts[feature.status] ?? 0) + 1;
            }
            const attention = readinessResults.flatMap((result, index) => {
              if (result?.outcome !== 'NOT_READY') return [];
              return (result.blockers ?? []).map((blocker) => ({
                featureId: features[index]!.id,
                featureTitle: features[index]!.title,
                code: blocker.code,
                message: blocker.message,
              }));
            });
            return {
              project,
              featureCount: features.length,
              statusCounts,
              readiness: {
                ready: readinessResults.filter((result) => result?.outcome === 'READY_TO_START')
                  .length,
                notReady: readinessResults.filter((result) => result?.outcome === 'NOT_READY')
                  .length,
                unavailable: readinessResults.filter((result) => result === null).length,
              },
              attention,
              unavailable: false,
            };
          } catch {
            return {
              project,
              featureCount: 0,
              statusCounts: {},
              readiness: { ready: 0, notReady: 0, unavailable: 0 },
              attention: [],
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

  useEffect(() => {
    let current = true;
    const activeProjects = projects.filter(
      (project) => project.workspace_id === workspaceId && project.status === 'active',
    );
    queueMicrotask(() => {
      if (current) setActivityState('loading');
      if (activeProjects.length === 0) {
        if (current) {
          setActivity([]);
          setActivityState('loaded');
        }
        return;
      }
      void Promise.all(
        activeProjects.map(async (project) => {
          const [runs, handoffs] = await Promise.all([
            organizationApi.listRuns(workspaceId, project.id),
            organizationApi.listHandoffs(workspaceId, project.id),
          ]);
          return { project, runs, handoffs };
        }),
      )
        .then((records) => {
          if (!current) return;
          const items: ActivityItem[] = records.flatMap(({ project, runs, handoffs }) => [
            ...runs.map((run: Run) => ({
              id: `run-${run.id}`,
              kind: 'run' as const,
              title: run.title,
              status: run.status,
              occurredAt: run.updated_at || run.created_at,
              projectName: project.name,
            })),
            ...handoffs.map((handoff: Handoff) => ({
              id: `handoff-${handoff.id}`,
              kind: 'handoff' as const,
              title: handoff.title,
              status: handoff.status,
              occurredAt: handoff.updated_at || handoff.created_at,
              projectName: project.name,
            })),
          ]);
          items.sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
          setActivity(items.slice(0, 8));
          setActivityState('loaded');
        })
        .catch(() => {
          if (!current) return;
          setActivity([]);
          setActivityState('error');
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
    activity,
    activityState,
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
    setWorkspaceId,
    setWorkspaceName,
    showArchived,
    toggleProject,
    visibleProjects,
    workspaceId,
    workspaceName,
    workspaces,
  };
}
