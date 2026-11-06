import { Link, useParams } from 'react-router-dom';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  DialogV2,
  FeedbackStateV2,
  FormField,
  MetricCard,
  SectionHeader,
  TextInputV2,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from './ProjectOverviewPage.module.css';
import { useProjectOverviewController } from './useProjectOverviewController';

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
  const {
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
  } = useProjectOverviewController({ workspaceId, projectId });

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
        <FeedbackStateV2
          state="error"
          title="Project overview unavailable"
          description={loadError}
          actions={<ButtonV2 onClick={retryLoad}>Retry loading overview</ButtonV2>}
        />
      ) : !overview || !project ? (
        <FeedbackStateV2 state="loading" title="Loading project overview" />
      ) : (
        <>
          {success && <AlertV2 tone="success">{success}</AlertV2>}
          {mutationError && (
            <FeedbackStateV2
              state="error"
              title="Project update failed"
              description={mutationError.message}
              actions={
                <ButtonV2
                  disabled={busy}
                  onClick={() => {
                    if (mutationError.action === 'archive') {
                      clearFeedback();
                      setConfirmArchive(true);
                    } else void mutate(mutationError.action);
                  }}
                >
                  Retry update
                </ButtonV2>
              }
            />
          )}
          <section aria-label="Project details">
            <CardV2>
              <SectionHeader
                title={project.name}
                actions={
                  <div className={styles.actions}>
                    <ButtonV2
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
                    </ButtonV2>
                    <ButtonV2
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
                    </ButtonV2>
                  </div>
                }
              />
              <BadgeV2 tone={project.status === 'archived' ? 'neutral' : 'success'}>
                {project.status}
              </BadgeV2>
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
                    <TextInputV2
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
                    <ButtonV2 type="submit" disabled={busy}>
                      Save project
                    </ButtonV2>
                    <ButtonV2
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(false);
                        clearFeedback();
                      }}
                    >
                      Cancel edit
                    </ButtonV2>
                  </div>
                </form>
              )}
            </CardV2>
          </section>
          <section aria-label="Project summary" className={styles.stack}>
            <h2>Planning summary</h2>
            <p>
              Planning records describe declared work; they do not establish execution or delivery.
            </p>
            <div className={styles.metrics}>
              <MetricCard label="Features" value={overview.features.length} />
              <MetricCard label="Tasks" value={overview.tasks} />
              <MetricCard
                label="Epics"
                value={overview.epics}
                detail={`${overview.epicBreakdown.workflow} in workflow · ${overview.epicBreakdown.archived} archived · ${overview.epicBreakdown.legacy} legacy`}
              />
              <MetricCard
                label="Acceptance criteria"
                value={`${overview.satisfiedCriteria} / ${overview.criteria}`}
                detail="Declared satisfied / total"
              />
              <MetricCard label="Dependencies" value={overview.dependencies} />
            </div>
          </section>
          <section aria-label="Pending Features">
            <CardV2>
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
            </CardV2>
          </section>
          <section aria-label="Workspace details">
            <CardV2>
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
            </CardV2>
          </section>
          {confirmArchive && (
            <DialogV2
              onOpenChange={(nextOpen) => {
                if (!nextOpen) setConfirmArchive(false);
              }}
              open
              title="Archive project?"
              description={`Archive ${project.name}? Planning will be read-only until the Project is restored.`}
              footer={
                <>
                  <ButtonV2 variant="secondary" onClick={() => setConfirmArchive(false)}>
                    Cancel
                  </ButtonV2>
                  <ButtonV2 onClick={() => void mutate('archive')}>Confirm archive</ButtonV2>
                </>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
