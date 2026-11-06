import { useEffect, useState, type FormEvent } from 'react';
import { organizationApi } from '@forge-org/api-client';
import { useOrganizationController } from './useOrganizationController';

export function useOrganizationPage() {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [recentEpics, setRecentEpics] = useState<
    Array<{
      workspaceId: string;
      projectId: string;
      id: string;
      title: string;
      updatedAt: string;
      workItems: number;
    }>
  >([]);

  useEffect(() => {
    let current = true;
    const active = projects.filter(
      (project) => project.workspace_id === workspaceId && project.status === 'active',
    );
    void Promise.all(
      active.map(async (project) => {
        try {
          const overview = await organizationApi.planningOverview(workspaceId, project.id);
          return overview.epics
            .filter((epic) => !epic.archived_at && epic.status !== 'done')
            .map((epic) => ({
              workspaceId,
              projectId: project.id,
              id: epic.id,
              title: epic.title,
              updatedAt: epic.updated_at,
              workItems: epic.features.length,
            }));
        } catch {
          return [];
        }
      }),
    ).then((lists) => {
      if (current) {
        setRecentEpics(
          lists
            .flat()
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, 2),
        );
      }
    });
    return () => {
      current = false;
    };
  }, [projects, workspaceId]);

  async function submitProject(event: FormEvent) {
    if (await createProject(event)) setProjectDialogOpen(false);
  }
  return {
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
  };
}
