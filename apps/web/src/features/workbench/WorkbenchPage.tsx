import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SectionHeader, StatusChip, Textarea } from '@forge-org/ui';
import {
  organizationApi,
  type Handoff,
  type HandoffRevision,
  type Run,
} from '@forge-org/api-client';
import styles from './WorkbenchPage.module.css';

export function WorkbenchPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [runs, setRuns] = useState<Run[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [revisions, setRevisions] = useState<Record<string, HandoffRevision[]>>({});
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busyHandoffId, setBusyHandoffId] = useState<string | null>(null);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const [nextRuns, nextHandoffs] = await Promise.all([
          organizationApi.listRuns(workspaceId, projectId),
          organizationApi.listHandoffs(workspaceId, projectId),
        ]);
        const nextRevisions = await Promise.all(
          nextHandoffs.map(
            async (handoff) =>
              [
                handoff.id,
                await organizationApi.listHandoffRevisions(workspaceId, projectId, handoff.id),
              ] as const,
          ),
        );
        if (!isCurrent()) return;
        setRuns(nextRuns);
        setHandoffs(nextHandoffs);
        setRevisions(Object.fromEntries(nextRevisions));
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load reported work.');
        }
      }
    },
    [projectId, workspaceId],
  );
  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);
  async function createRun(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await organizationApi.createRun(workspaceId, projectId, title);
      setTitle('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record run.');
    }
  }
  async function createHandoff(run: Run) {
    try {
      await organizationApi.createHandoff(
        workspaceId,
        projectId,
        run.id,
        `Handoff for ${run.title}`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create handoff.');
    }
  }
  async function saveHandoff(event: FormEvent, handoff: Handoff) {
    event.preventDefault();
    const values = new FormData(event.currentTarget as HTMLFormElement);
    setBusyHandoffId(handoff.id);
    try {
      await organizationApi.updateHandoff(workspaceId, projectId, handoff.id, {
        expected_version: handoff.version,
        summary: String(values.get('summary') ?? ''),
        next_actions: String(values.get('next_actions') ?? ''),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update handoff.');
    } finally {
      setBusyHandoffId(null);
    }
  }
  async function readyHandoff(handoff: Handoff) {
    setBusyHandoffId(handoff.id);
    try {
      await organizationApi.readyHandoff(workspaceId, projectId, handoff.id, handoff.version);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to make handoff ready.');
    } finally {
      setBusyHandoffId(null);
    }
  }
  async function acknowledgeHandoff(event: FormEvent, handoff: Handoff) {
    event.preventDefault();
    const values = new FormData(event.currentTarget as HTMLFormElement);
    if (!handoff.current_revision) return;
    setBusyHandoffId(handoff.id);
    try {
      await organizationApi.acknowledgeHandoff(
        workspaceId,
        projectId,
        handoff.id,
        handoff.current_revision,
        String(values.get('acknowledged_by') ?? ''),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to acknowledge handoff.');
    } finally {
      setBusyHandoffId(null);
    }
  }
  const downloadPath = (handoffId: string, revision: number, format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/revisions/${revision}/download?format=${format}`;
  return (
    <div className={styles.stack}>
      <SectionHeader title="Workbench" eyebrow="FORGE / Reported work" />
      <p>
        Runs and handoffs are human-reported records. FORGE does not execute agents or claim
        delivery evidence.
      </p>
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
                <span>
                  {run.executor_type} / {run.execution_mode}
                </span>
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
