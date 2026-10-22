import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Card, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi } from '@forge-org/api-client';
import type { CandidateHistory, ReleaseCandidate } from '@forge-org/api-client';
import styles from './DeliveryDetails.module.css';

export function CandidateDetailPage() {
  const { candidateId = '' } = useParams();
  const location = useLocation();
  const routeContext = location.state as { workspaceId?: string; projectId?: string } | null;
  const workspaceId = routeContext?.workspaceId ?? '';
  const projectId = routeContext?.projectId ?? '';
  const missingContext = !workspaceId || !projectId;
  const [candidate, setCandidate] = useState<ReleaseCandidate | null>(null);
  const [history, setHistory] = useState<CandidateHistory[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (missingContext)
      return () => {
        active = false;
      };
    void Promise.all([
      organizationApi.getCandidate(workspaceId, projectId, candidateId),
      organizationApi.listCandidateRevisions(workspaceId, projectId, candidateId),
    ])
      .then(([current, revisions]) => {
        if (active) {
          setCandidate(current);
          setHistory(revisions);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Could not load candidate history.');
      });
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, candidateId, missingContext]);
  return (
    <main className={styles.page}>
      <Link className={styles.back} to={`/delivery/${workspaceId}/${projectId}`}>
        ← Back to delivery
      </Link>
      <SectionHeader title="Candidate detail & history" />
      <p>Current candidate and saved revision snapshots.</p>
      {missingContext && (
        <p className={styles.error} role="alert">
          Candidate detail needs workspace and project context. Open it from Delivery.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!missingContext && !error && !candidate && <p role="status">Loading candidate…</p>}
      {candidate && (
        <>
          <Card>
            <h2>{candidate.title}</h2>
            <p>{candidate.summary}</p>
            <StatusChip>{candidate.status}</StatusChip>
            <div className={styles.grid}>
              <Field label="Candidate ID">{candidate.id}</Field>
              <Field label="Revision">{candidate.revision}</Field>
              <Field label="Fingerprint">{candidate.fingerprint ?? 'Not available'}</Field>
            </div>
          </Card>
          <Card>
            <h2>Saved revision history</h2>
            <p>
              Each entry is the snapshot returned by the revisions endpoint; it is not an
              event-by-event change log.
            </p>
            {history.length ? (
              history.map((revision) => (
                <details className={styles.revision} key={revision.id}>
                  <summary>
                    Revision {revision.revision} · {revision.status} · {revision.fingerprint}
                  </summary>
                  <pre className={styles.snapshot}>{revision.snapshot_json}</pre>
                </details>
              ))
            ) : (
              <p>No revisions are returned.</p>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  );
}
