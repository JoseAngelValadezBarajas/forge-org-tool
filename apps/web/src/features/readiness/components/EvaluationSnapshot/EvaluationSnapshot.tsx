import { Card } from '@forge-org/ui';
import styles from './EvaluationSnapshot.module.css';

export type EvaluationSnapshotState = 'Preview' | 'Saved' | 'Stale';

export interface EvaluationSnapshotProps {
  fingerprint: string;
  evaluatedAt: string;
  state?: EvaluationSnapshotState;
  /** @deprecated Use state. Kept for existing callers. */
  stale?: boolean;
  children?: React.ReactNode;
}

export function EvaluationSnapshot({
  fingerprint,
  evaluatedAt,
  state,
  stale = false,
  children,
}: EvaluationSnapshotProps) {
  const snapshotState: EvaluationSnapshotState = stale ? 'Stale' : (state ?? 'Preview');
  const stateLabel = snapshotState.toUpperCase();

  return (
    <Card className={styles.snapshot}>
      <section role="group" aria-label="Evaluation snapshot">
        <header>
          <h3>Readiness evaluation</h3>
        </header>
        <p className={`${styles.state} ${styles[snapshotState.toLowerCase()]}`}>{stateLabel}</p>
        <dl>
          <dt>Input fingerprint</dt>
          <dd>
            <code>{fingerprint}</code>
          </dd>
          <dt>Evaluated</dt>
          <dd>{evaluatedAt || 'Time unavailable'}</dd>
        </dl>
        {children}
      </section>
    </Card>
  );
}
