import { useEffect, useRef, useState, type FormEvent } from 'react';
import { organizationApi, type Feature, type Project, type Workspace } from '@forge-org/api-client';

type Overview = {
  project: Project;
  workspace: Workspace;
  features: Feature[];
  tasks: number;
  epics: number;
  epicBreakdown: { workflow: number; archived: number; legacy: number };
  criteria: number;
  satisfiedCriteria: number;
  dependencies: number;
};

type Mutation = 'save' | 'archive' | 'restore';

type MutationError = { message: string; action: Mutation };

const priorities: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function assertProjectScope(project: Project, workspaceId: string, projectId: string) {
  if (!project || project.id !== projectId || project.workspace_id !== workspaceId) {
    throw new Error('Project not found in this workspace.');
  }
}

async function loadOverview(workspaceId: string, projectId: string): Promise<Overview> {
  const [project, workspaces] = await Promise.all([
    organizationApi.getProject(workspaceId, projectId),
    organizationApi.listWorkspaces(),
  ]);
  assertProjectScope(project, workspaceId, projectId);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) throw new Error('Owning Workspace not found.');
  const [planning, dependencies] = await Promise.all([
    organizationApi.planningOverview(workspaceId, projectId),
    organizationApi.listDependencies(workspaceId, projectId),
  ]);
  const features = planning.epics
    .flatMap((epic) => epic.features)
    .concat(planning.unassigned_features);
  const records = await Promise.all(
    features.map(async (feature) => {
      const [tasks, criteria] = await Promise.all([
        organizationApi.listTasks(workspaceId, projectId, feature.id),
        organizationApi.listCriteria(workspaceId, projectId, feature.id),
      ]);
      return { tasks, criteria };
    }),
  );
  const criteria = records.flatMap((record) => record.criteria);
  const supportedEpicStatuses = new Set(['backlog', 'ready', 'in_progress', 'verify', 'done']);
  return {
    project,
    workspace,
    features,
    tasks: records.reduce((total, record) => total + record.tasks.length, 0),
    epics: planning.epics.length,
    epicBreakdown: {
      workflow: planning.epics.filter(
        (epic) => !epic.archived_at && supportedEpicStatuses.has(epic.status),
      ).length,
      archived: planning.epics.filter((epic) => Boolean(epic.archived_at)).length,
      legacy: planning.epics.filter(
        (epic) => !epic.archived_at && !supportedEpicStatuses.has(epic.status),
      ).length,
    },
    criteria: criteria.length,
    satisfiedCriteria: criteria.filter((criterion) => criterion.satisfied).length,
    dependencies: dependencies.length,
  };
}

export function useProjectOverviewController({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [mutationError, setMutationError] = useState<MutationError | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let current = true;
    void loadOverview(workspaceId, projectId)
      .then((data) => {
        if (current) setOverview(data);
      })
      .catch((cause: unknown) => {
        if (current)
          setLoadError(cause instanceof Error ? cause.message : 'Unable to load project overview.');
      });
    return () => {
      current = false;
    };
  }, [workspaceId, projectId, attempt]);

  function retryLoad() {
    setLoadError('');
    setOverview(null);
    setAttempt((value) => value + 1);
  }

  function clearFeedback() {
    setMutationError(null);
    setSuccess('');
  }

  async function mutate(action: Mutation) {
    if (!overview || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    clearFeedback();
    setConfirmArchive(false);
    try {
      const project =
        action === 'save'
          ? await organizationApi.updateProject(workspaceId, projectId, { name, description })
          : await organizationApi.setProjectStatus(
              workspaceId,
              projectId,
              action === 'archive' ? 'archived' : 'active',
            );
      assertProjectScope(project, workspaceId, projectId);
      setOverview((data) => data && { ...data, project });
      if (action === 'save') setEditing(false);
      setSuccess(
        action === 'save'
          ? 'Project saved'
          : action === 'archive'
            ? 'Project archived'
            : 'Project restored',
      );
    } catch (cause) {
      setMutationError({
        message: cause instanceof Error ? cause.message : 'Unable to update project.',
        action,
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    void mutate('save');
  }

  const project = overview?.project;
  const pending =
    overview?.features
      .filter((feature) => feature.status !== 'done')
      .sort(
        (left, right) =>
          (priorities[left.priority] ?? 4) - (priorities[right.priority] ?? 4) ||
          Date.parse(right.updated_at) - Date.parse(left.updated_at),
      )
      .slice(0, 4) ?? [];
  return {
    overview,
    loadError,
    editing,
    setEditing,
    name,
    setName,
    description,
    setDescription,
    confirmArchive,
    setConfirmArchive,
    busy,
    mutationError,
    success,
    retryLoad,
    clearFeedback,
    mutate,
    save,
    project,
    pending,
  };
}
