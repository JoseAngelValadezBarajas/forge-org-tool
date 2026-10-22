import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SectionHeader, StatusChip, Textarea } from '@forge-org/ui';
import styles from './RunDetailPage.module.css';
import { useRunDetailController } from './useRunDetailController';

export function RunDetailPage() {
  const { workspaceId = '', projectId = '', runId = '' } = useParams();
  const { error, events, load, loading, recordActivity, run, saving } = useRunDetailController(
    workspaceId,
    projectId,
    runId,
  );

  return (
    <div className={styles.stack}>
      <Link to={`/workbench/${workspaceId}/${projectId}`}>Back to Workbench</Link>
      <SectionHeader title={run?.title ?? 'Run detail'} eyebrow="FORGE / Human-reported run" />
      <p className={styles.provenance}>Reported · not independently verified</p>
      {loading && (
        <p role="status" aria-live="polite">
          Loading run details…
        </p>
      )}
      {error && (
        <div className={styles.feedback}>
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry loading run timeline
          </Button>
        </div>
      )}
      {run && (
        <>
          <Card className={styles.summary}>
            <div className={styles.heading}>
              <h3>{run.title}</h3>
              <StatusChip tone="accent">{run.status}</StatusChip>
            </div>
            <dl className={styles.metadata}>
              <div>
                <dt>Run ID</dt>
                <dd>{run.id}</dd>
              </div>
              <div>
                <dt>Feature</dt>
                <dd>{run.feature_id ?? 'Not linked'}</dd>
              </div>
              <div>
                <dt>Execution mode</dt>
                <dd>
                  {run.executor_type} · {run.execution_mode}
                </dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>Run version {run.version}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h3>Activity timeline</h3>
            {loading ? null : events.length === 0 ? (
              <p>No reported activity yet.</p>
            ) : (
              <ol className={styles.timeline} aria-label="Activity timeline">
                {events.map((activity) => {
                  const timestamp = activity.occurred_at ?? activity.created_at;
                  return (
                    <li key={activity.id}>
                      <time dateTime={timestamp}>{timestamp}</time>
                      <div className={styles.event}>
                        <div className={styles.heading}>
                          <strong>{activity.title}</strong>
                          <StatusChip tone="neutral">{activity.event_type}</StatusChip>
                        </div>
                        {activity.description && <p>{activity.description}</p>}
                        <small>Reported by {activity.origin}; not verification evidence.</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
          <Card>
            <h3>Report activity</h3>
            <p>Activity is appended to this run as a human report and cannot be edited here.</p>
            <form onSubmit={(event) => void recordActivity(event)} className={styles.form}>
              <FormField label="Event type">
                <Input name="event_type" required maxLength={100} />
              </FormField>
              <FormField label="Event title">
                <Input name="title" required maxLength={200} />
              </FormField>
              <FormField label="Event description">
                <Textarea name="description" />
              </FormField>
              <FormField label="When it occurred (optional)">
                <Input name="occurred_at" type="datetime-local" />
              </FormField>
              <Button type="submit" disabled={saving || loading || !run}>
                {saving ? 'Recording activity…' : 'Record activity event'}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
