import { Card, StatusChip } from '@forge-org/ui';
import styles from './EvaluationSnapshot.module.css';

export interface EvaluationSnapshotProps {
  fingerprint: string;
  evaluatedAt: string;
  stale?: boolean;
  children?: React.ReactNode;
}

export function EvaluationSnapshot({
  fingerprint,
  evaluatedAt,
  stale = false,
  children,
}: EvaluationSnapshotProps) {
  return (
    <Card className={styles.snapshot}>
      <section role="group" aria-label="Evaluation snapshot">
        <header>
          <h3>Evaluation snapshot</h3>
          <StatusChip tone={stale ? 'warning' : 'success'}>
            {stale ? 'Stale snapshot' : 'Current snapshot'}
          </StatusChip>
        </header>
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
