import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi } from '@forge-org/api-client';
import type { Handoff, HandoffRevision } from '@forge-org/api-client';
import styles from './HandoffDetailPage.module.css';
import { ProvenanceNotice } from './components';

type Ack = { acknowledged_by: string; revision: number; acknowledged_at?: string };

export function HandoffDetailPage() {
  const { workspaceId = '', projectId = '', handoffId = '' } = useParams();
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [revision, setRevision] = useState<HandoffRevision | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [ack, setAck] = useState<Ack | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const downloadPath = (format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/revisions/${revision?.revision ?? ''}/download?format=${format}`;

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const handoffs = await organizationApi.listHandoffs(workspaceId, projectId);
      const current = handoffs.find((item) => item.id === handoffId);
      if (!current) throw new Error('Handoff not found in this project.');
      const revisions = await organizationApi.listHandoffRevisions(
        workspaceId,
        projectId,
        handoffId,
      );
      const currentRevision =
        current.current_revision == null
          ? null
          : (revisions.find((item) => item.revision === current.current_revision) ?? null);
      if (current.current_revision != null && !currentRevision) {
        throw new Error(`Immutable revision ${current.current_revision} is unavailable.`);
      }
      if (currentRequest === requestId.current) {
        setHandoff(current);
        setRevision(currentRevision);
      }
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Could not load handoff.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId, projectId, handoffId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  async function acknowledge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!handoff || !revision || handoff.status !== 'READY') return;
    setSaving(true);
    setError('');
    try {
      const response = await organizationApi.acknowledgeHandoff(
        workspaceId,
        projectId,
        handoff.id,
        revision.revision,
        reviewer.trim(),
      );
      setAck({ acknowledged_by: response.acknowledged_by, revision: response.revision });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not acknowledge this revision.');
    } finally {
      setSaving(false);
    }
  }

  const acknowledgeable = handoff?.status === 'READY' && revision != null;
  return (
    <main className={styles.page}>
      <Link to={`/workbench/${workspaceId}/${projectId}`}>Back to workbench handoffs</Link>
      <SectionHeader
        title={handoff?.title ?? 'Handoff detail'}
        eyebrow="Immutable handoff review"
      />
      <ProvenanceNotice source="Reported handoff snapshot">
        Acknowledgement records review of this revision only; it does not indicate technical
        approval, execution, testing, CI, or release.
      </ProvenanceNotice>
      {loading && (
        <p role="status" aria-live="polite">
          Loading handoff snapshot…
        </p>
      )}
      {error && (
        <div className={styles.feedback}>
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry loading handoff
          </Button>
        </div>
      )}
      {handoff && !loading && (
        <div className={styles.stack}>
          <Card>
            <div className={styles.row}>
              <StatusChip tone="accent">{handoff.status}</StatusChip>
              <strong>Handoff {handoff.id}</strong>
            </div>
            <dl>
              <dt>Run</dt>
              <dd>{handoff.run_id}</dd>
              <dt>Feature</dt>
              <dd>{handoff.feature_id ?? 'Not associated'}</dd>
              <dt>Created</dt>
              <dd>{handoff.created_at}</dd>
              <dt>Revision</dt>
              <dd>
                {revision ? `Revision ${revision.revision}` : 'No immutable revision published'}
              </dd>
              {revision && (
                <>
                  <dt>Schema</dt>
                  <dd>{revision.schema_version}</dd>
                  <dt>Fingerprint</dt>
                  <dd>{revision.fingerprint}</dd>
                  <dt>Snapshot created</dt>
                  <dd>{revision.created_at}</dd>
                </>
              )}
            </dl>
          </Card>
          {revision && (
            <>
              <Card>
                <div className={styles.row}>
                  <h2>{revision.title}</h2>
                  <a href={downloadPath('json')} aria-label="Download JSON snapshot">
                    Download JSON
                  </a>
                  <a href={downloadPath('markdown')} aria-label="Download Markdown snapshot">
                    Download Markdown
                  </a>
                </div>
                <div className={styles.stack}>
                  <section>
                    <h3>Summary</h3>
                    <p>{revision.summary}</p>
                  </section>
                  <section>
                    <h3>Next actions</h3>
                    <p>{revision.next_actions}</p>
                  </section>
                  <section>
                    <h3>Exact JSON snapshot</h3>
                    <pre className={styles.snapshot}>{revision.payload_json}</pre>
                  </section>
                  <section>
                    <h3>Exact Markdown snapshot</h3>
                    <pre className={styles.snapshot}>{revision.markdown}</pre>
                  </section>
                </div>
              </Card>
              {ack && (
                <p role="status">
                  Acknowledged by {ack.acknowledged_by} for revision {ack.revision}. This is not
                  technical approval.
                </p>
              )}
              {handoff.status === 'ACKNOWLEDGED' && !ack && (
                <p role="status">
                  Revision {revision.revision} is acknowledged. The API does not expose
                  acknowledgement actor or timestamp when reloading this handoff.
                </p>
              )}
              {acknowledgeable && (
                <Card>
                  <form onSubmit={(event) => void acknowledge(event)} className={styles.stack}>
                    <p>
                      Review and acknowledge revision {revision.revision}. This action is attached
                      to this immutable revision.
                    </p>
                    <FormField label="Acknowledged by">
                      <Input
                        value={reviewer}
                        onChange={(event) => setReviewer(event.target.value)}
                        required
                      />
                    </FormField>
                    <Button type="submit" disabled={saving || !reviewer.trim()}>
                      Acknowledge revision {revision.revision}
                    </Button>
                  </form>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
