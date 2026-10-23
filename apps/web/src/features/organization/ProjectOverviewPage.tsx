import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { organizationApi, type Feature, type Project, type Workspace } from '@forge-org/api-client';
import {
  Alert,
  Button,
  Card,
  Dialog,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  MetricCard,
  SectionHeader,
  StatusChip,
  Textarea,
} from '@forge-org/ui';
import styles from './ProjectOverviewPage.module.css';

type Overview = {
  project: Project;
  workspace: Workspace;
  features: Feature[];
  tasks: number;
  epics: number;
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
  return {
    project,
    workspace,
    features,
    tasks: records.reduce((total, record) => total + record.tasks.length, 0),
    epics: planning.epics.length,
    criteria: criteria.length,
    satisfiedCriteria: criteria.filter((criterion) => criterion.satisfied).length,
    dependencies: dependencies.length,
  };
}

export function ProjectOverviewPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  // A different route owns fresh state, including drafts and in-flight mutations.
  return (
    <ProjectOverview
      key={`${workspaceId}/${projectId}`}
      workspaceId={workspaceId}
      projectId={projectId}
    />
  );
}

function ProjectOverview({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
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

  return (
    <div className={styles.stack}>
      <SectionHeader title="Project Overview" eyebrow="FORGE / Organization" />
      <nav aria-label="Project sections" className={styles.actions}>
        <Link to="/">Back to Organization</Link>
        <Link to={`/planning/${workspaceId}/${projectId}`}>Open planning board</Link>
        <Link to={`/transfer/${workspaceId}/${projectId}`}>Transfer / export</Link>
        <Link to={`/transfer/${workspaceId}/${projectId}/epics/${projectId}`}>Import Epic</Link>
      </nav>
      {loadError ? (
        <ErrorState
          title="Project overview unavailable"
          description={loadError}
          actions={<Button onClick={retryLoad}>Retry loading overview</Button>}
        />
      ) : !overview || !project ? (
        <LoadingState label="Loading project overview" />
      ) : (
        <>
          {success && (
            <Alert tone="success" role="status">
              {success}
            </Alert>
          )}
          {mutationError && (
            <ErrorState
              title="Project update failed"
              description={mutationError.message}
              actions={
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (mutationError.action === 'archive') {
                      clearFeedback();
                      setConfirmArchive(true);
                    } else void mutate(mutationError.action);
                  }}
                >
                  Retry update
                </Button>
              }
            />
          )}
          <section aria-label="Project details">
            <Card>
              <SectionHeader
                title={project.name}
                actions={
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      disabled={busy || editing}
                      onClick={() => {
                        clearFeedback();
                        setName(project.name);
                        setDescription(project.description ?? '');
                        setEditing(true);
                      }}
                    >
                      Edit project
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || editing}
                      onClick={() => {
                        if (project.status === 'archived') void mutate('restore');
                        else {
                          clearFeedback();
                          setConfirmArchive(true);
                        }
                      }}
                    >
                      {project.status === 'archived' ? 'Restore project' : 'Archive project'}
                    </Button>
                  </div>
                }
              />
              <StatusChip tone={project.status === 'archived' ? 'neutral' : 'success'}>
                {project.status}
              </StatusChip>
              <p className={styles.description}>{project.description || 'No description.'}</p>
              <dl className={styles.metadata}>
                <div>
                  <dt>Workspace</dt>
                  <dd>{overview.workspace.name}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>
                    <time dateTime={project.created_at}>{project.created_at}</time>
                  </dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>
                    <time dateTime={project.updated_at}>{project.updated_at}</time>
                  </dd>
                </div>
                <div>
                  <dt>Archived</dt>
                  <dd>
                    {project.archived_at ? (
                      <time dateTime={project.archived_at}>{project.archived_at}</time>
                    ) : (
                      'Not archived'
                    )}
                  </dd>
                </div>
              </dl>
              {editing && (
                <form onSubmit={save} className={styles.form}>
                  <FormField label="Project name">
                    <Input
                      id="overview-project-name"
                      required
                      value={name}
                      disabled={busy}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Description">
                    <Textarea
                      id="overview-project-description"
                      rows={3}
                      value={description}
                      disabled={busy}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </FormField>
                  <div className={styles.actions}>
                    <Button type="submit" disabled={busy}>
                      Save project
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(false);
                        clearFeedback();
                      }}
                    >
                      Cancel edit
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </section>
          <section aria-label="Project summary" className={styles.stack}>
            <h2>Planning summary</h2>
            <p>
              Planning records describe declared work; they do not establish execution or delivery.
            </p>
            <div className={styles.metrics}>
              <MetricCard label="Features" value={overview.features.length} />
              <MetricCard label="Tasks" value={overview.tasks} />
              <MetricCard label="Epics" value={overview.epics} />
              <MetricCard
                label="Acceptance criteria"
                value={`${overview.satisfiedCriteria} / ${overview.criteria}`}
                detail="Declared satisfied / total"
              />
              <MetricCard label="Dependencies" value={overview.dependencies} />
            </div>
          </section>
          <section aria-label="Pending Features">
            <Card>
              <h2>Pending Features</h2>
              {pending.length === 0 ? (
                <p>No pending Features.</p>
              ) : (
                <ul className={styles.pending}>
                  {pending.map((feature) => (
                    <li key={feature.id}>
                      <Link to={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}>
                        {feature.title}
                      </Link>
                      <span>
                        {feature.priority} · {feature.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
          <section aria-label="Workspace details">
            <Card>
              <h2>Owning Workspace</h2>
              <p>{overview.workspace.name}</p>
              {overview.workspace.description && <p>{overview.workspace.description}</p>}
              <dl className={styles.metadata}>
                <div>
                  <dt>Created</dt>
                  <dd>
                    <time dateTime={overview.workspace.created_at}>
                      {overview.workspace.created_at}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>
                    <time dateTime={overview.workspace.updated_at}>
                      {overview.workspace.updated_at}
                    </time>
                  </dd>
                </div>
              </dl>
            </Card>
          </section>
          {confirmArchive && (
            <Dialog
              open
              title="Archive project?"
              variant="destructive"
              description={`Archive ${project.name}? Planning will be read-only until the Project is restored.`}
              onCancel={() => setConfirmArchive(false)}
              actions={
                <>
                  <Button variant="secondary" onClick={() => setConfirmArchive(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void mutate('archive')}>Confirm archive</Button>
                </>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
