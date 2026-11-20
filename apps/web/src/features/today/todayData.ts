import {
  organizationApi,
  type Dependency,
  type Epic,
  type Project,
  type Workspace,
} from '@forge-org/api-client';
import type { TodayItem } from './todayModel';

export const ACTIVE_WORKSPACE_KEY = 'forge-active-workspace';
const DEFAULT_WORKSPACE_NAME = 'Personal';
export const INBOX_NAME = 'Inbox';

export type LoadedToday = {
  target: { workspaceId: string; project: Project };
  projectCount: number;
  /** Active projects of the workspace, to choose a destination when organizing. */
  projects: Project[];
  /** Epics of each project, keyed by project id. */
  epicsByProject: Record<string, Epic[]>;
  /** Dependencies of every project, only when requested (the Blocked view needs them). */
  dependencies: Dependency[];
  items: TodayItem[];
};

function announce(name: string, detail: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Resolves the active workspace and its Inbox and every work item of its active projects.
 * With `bootstrap` (the Today page) a missing workspace or Inbox is created on first use;
 * without it (background reminders) nothing is ever created and `null` means "nothing to read".
 */
type LoadOptions = { dependencies?: boolean };
export async function loadTodayData(
  options: LoadOptions & { bootstrap: true },
): Promise<LoadedToday>;
export async function loadTodayData(
  options: LoadOptions & { bootstrap: false },
): Promise<LoadedToday | null>;
export async function loadTodayData(
  options: LoadOptions & { bootstrap: boolean },
): Promise<LoadedToday | null> {
  const workspaces = await organizationApi.listWorkspaces();
  const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? '';
  const open = workspaces.filter((candidate) => !candidate.archived_at);
  let workspace: Workspace | undefined =
    open.find((candidate) => candidate.id === saved) ?? open[0];
  if (!workspace && workspaces.length === 0 && options.bootstrap) {
    workspace = await organizationApi.createWorkspace(DEFAULT_WORKSPACE_NAME);
    announce('forge:workspace-created', { workspace });
  }
  if (!workspace) {
    if (!options.bootstrap) return null;
    throw new Error('Every workspace is archived. Restore one from Workspaces to continue.');
  }
  const workspaceId = workspace.id;
  if (options.bootstrap) {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    announce('forge:active-workspace-change', { workspaceId });
  }

  let projects = await organizationApi.listProjects(workspaceId);
  if (projects.length === 0) {
    if (!options.bootstrap) return null;
    const inbox = await organizationApi.createProject(workspaceId, INBOX_NAME);
    projects = [inbox];
    announce('forge:projects-changed', {});
  }
  const inbox =
    projects.find((project) => project.name.toLowerCase() === INBOX_NAME.toLowerCase()) ??
    projects[0];

  const overviews = await Promise.all(
    projects.map(async (project) => ({
      project,
      overview: await organizationApi.planningOverview(workspaceId, project.id),
    })),
  );
  const items = overviews.flatMap(({ project, overview }) =>
    [...overview.epics.flatMap((epic) => epic.features), ...overview.unassigned_features].map(
      (feature): TodayItem => ({
        feature,
        workspaceId,
        projectId: project.id,
        projectName: project.name,
      }),
    ),
  );
  const epicsByProject = Object.fromEntries(
    overviews.map(({ project, overview }) => [project.id, overview.epics]),
  );
  const dependencies = options.dependencies
    ? (
        await Promise.all(
          projects.map((project) => organizationApi.listDependencies(workspaceId, project.id)),
        )
      ).flat()
    : [];
  return {
    target: { workspaceId, project: inbox },
    projectCount: projects.length,
    projects,
    epicsByProject,
    dependencies,
    items,
  };
}
