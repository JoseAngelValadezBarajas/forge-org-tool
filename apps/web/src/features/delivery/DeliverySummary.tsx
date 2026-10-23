import { Card } from '@forge-org/ui';
import styles from './DeliveryPage.module.css';

type DeliverySummaryProps = {
  evidenceCount: number;
  candidateCount: number;
  ruleCount: number;
};

export function DeliverySummary({
  evidenceCount,
  candidateCount,
  ruleCount,
}: DeliverySummaryProps) {
  return (
    <div className={styles.summaryGrid} aria-label="Delivery summary">
      <Card>
        <span className={styles.metricLabel}>Evidence</span>
        <strong className={styles.metricValue}>{evidenceCount}</strong>
        <small>reported records</small>
      </Card>
      <Card>
        <span className={styles.metricLabel}>Candidates</span>
        <strong className={styles.metricValue}>{candidateCount}</strong>
        <small>reviewable snapshots</small>
      </Card>
      <Card>
        <span className={styles.metricLabel}>Rules</span>
        <strong className={styles.metricValue}>{ruleCount}</strong>
        <small>deterministic checks</small>
      </Card>
      <Card>
        <span className={styles.metricLabel}>Release</span>
        <strong className={styles.metricValue}>NOT_PUBLISHED</strong>
        <small>no deployment claim</small>
      </Card>
    </div>
  );
}
