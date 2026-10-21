import { Card, StatusChip } from '@forge-org/ui';
import styles from './VerificationSummary.module.css';
export interface VerificationSummaryProps {
  outcome: string;
  fingerprint: string;
  blockers: string[];
  stale?: boolean;
}
export function VerificationSummary({
  outcome,
  fingerprint,
  blockers,
  stale = false,
}: VerificationSummaryProps) {
  return (
    <Card className={styles.summary}>
      <section role="group" aria-label="Verification summary">
        <header>
          <h3>Verification summary</h3>
          <StatusChip tone={outcome === 'PASS' && !stale ? 'success' : 'warning'}>
            {stale ? 'STALE' : outcome}
          </StatusChip>
        </header>
        <p>
          Input fingerprint: <code>{fingerprint}</code>
        </p>
        {blockers.length > 0 && (
          <ul>
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
