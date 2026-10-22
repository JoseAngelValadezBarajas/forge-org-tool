import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SectionHeader, StatusChip, Textarea } from '@forge-org/ui';
import styles from './WorkbenchPage.module.css';
import { useWorkbenchController } from './useWorkbenchController';
import { ProvenanceNotice, ReportField } from './components';

export function WorkbenchPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const {
    acknowledgeHandoff,
    busyHandoffId,
    createHandoff,
    createRun,
    error,
    handoffs,
    revisions,
    readyHandoff,
    runs,
    saveHandoff,
    setTitle,
    title,
  } = useWorkbenchController(workspaceId, projectId);
  const downloadPath = (handoffId: string, revision: number, format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/revisions/${revision}/download?format=${format}`;
  return (
    <div className={styles.stack}>
      <SectionHeader title="Workbench" eyebrow="FORGE / Reported work" />
      <ProvenanceNotice source="Human-reported runs and handoffs">
        FORGE does not execute agents or claim delivery evidence.
      </ProvenanceNotice>
      {error && <p role="alert">{error}</p>}
      <Card>
        <form onSubmit={createRun} className={styles.form}>
          <FormField label="Run title">
            <Input
              id="run-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </FormField>
          <Button type="submit">Record Run</Button>
        </form>
      </Card>
      <Card>
        <h3>Runs</h3>
        {runs.length === 0 ? (
          <p>No reported runs.</p>
        ) : (
          runs.map((run) => (
            <article className={styles.item} key={run.id}>
              <div>
                <StatusChip tone="accent">{run.status}</StatusChip>
                <strong>{run.title}</strong>
              </div>
              <div>
                <ReportField
                  label="Execution"
                  value={`${run.executor_type} / ${run.execution_mode}`}
                />
                <Link to={`/workbench/${workspaceId}/${projectId}/runs/${run.id}`}>
                  View run {run.title}
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => void createHandoff(run)}
                  aria-label={`Create handoff for ${run.title}`}
                >
                  Create handoff
                </Button>
              </div>
            </article>
          ))
        )}
      </Card>
      <Card>
        <h3>Handoffs</h3>
        {handoffs.length === 0 ? (
          <p>No handoffs.</p>
        ) : (
          handoffs.map((handoff) => (
            <article className={styles.item} key={handoff.id}>
              <div>
                <strong>{handoff.title}</strong>
                {handoff.status !== 'DRAFT' && (
                  <Link to={`/workbench/${workspaceId}/${projectId}/handoffs/${handoff.id}`}>
                    {handoff.status === 'ACKNOWLEDGED'
                      ? `View acknowledged handoff ${handoff.title}`
                      : `Review handoff ${handoff.title}`}
                  </Link>
                )}
                {handoff.status === 'DRAFT' ? (
                  <form
                    onSubmit={(event) => void saveHandoff(event, handoff)}
                    className={styles.form}
                  >
                    <Textarea
                      name="summary"
                      aria-label={`Summary for ${handoff.title}`}
                      defaultValue={handoff.summary}
                      placeholder="Summary"
                      required
                    />
                    <Textarea
                      name="next_actions"
                      aria-label={`Next actions for ${handoff.title}`}
                      defaultValue={handoff.next_actions}
                      placeholder="Next actions"
                      required
                    />
                    <div>
                      <Button type="submit" disabled={busyHandoffId === handoff.id}>
                        Save handoff details
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busyHandoffId === handoff.id}
                        onClick={() => void readyHandoff(handoff)}
                      >
                        Mark handoff ready
                      </Button>
                    </div>
                  </form>
                ) : (
                  handoff.status === 'READY' &&
                  handoff.current_revision && (
                    <>
                      <p>
                        Ready handoffs are immutable revisions for human review; acknowledgement
                        does not certify implementation, testing, CI, or release.
                      </p>
                      <form
                        onSubmit={(event) => void acknowledgeHandoff(event, handoff)}
                        className={styles.form}
                      >
                        <Input
                          name="acknowledged_by"
                          aria-label={`Acknowledged by ${handoff.title}`}
                          placeholder="Reviewer"
                          required
                        />
                        <Button type="submit" disabled={busyHandoffId === handoff.id}>
                          Acknowledge revision
                        </Button>
                      </form>
                    </>
                  )
                )}
              </div>
              <div>
                <StatusChip tone="accent">{handoff.status}</StatusChip>
                {(revisions[handoff.id] ?? []).map((revision) => (
                  <div className={styles.revision} key={revision.id}>
                    <strong>Revision {revision.revision}</strong>
                    <span>
                      {revision.schema_version} · {revision.fingerprint}
                    </span>
                    <div>
                      <a href={downloadPath(handoff.id, revision.revision, 'json')}>JSON</a>
                      <a href={downloadPath(handoff.id, revision.revision, 'markdown')}>Markdown</a>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </Card>
    </div>
  );
}
