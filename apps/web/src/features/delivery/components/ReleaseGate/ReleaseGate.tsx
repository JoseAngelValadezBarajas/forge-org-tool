import { Card, StatusChip } from '@forge-org/ui';
import styles from './ReleaseGate.module.css';
export interface ReleaseGateProps {
  outcome: string;
  children?: React.ReactNode;
}
export function ReleaseGate({ outcome, children }: ReleaseGateProps) {
  return (
    <Card className={styles.gate}>
      <section aria-label="Release gate">
        <header>
          <h3>Gate evaluation</h3>
          <StatusChip tone={outcome === 'PASS' ? 'success' : 'warning'}>{outcome}</StatusChip>
        </header>
        {children}
      </section>
    </Card>
  );
}
