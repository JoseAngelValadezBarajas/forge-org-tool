import type { ReactNode } from 'react';
import styles from '../primitives/Shared.module.css';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}

export function MetricCard({ label, value, detail, className }: MetricCardProps) {
  return (
    <article className={[styles.metric, className].filter(Boolean).join(' ')}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      {detail && <span className={styles.metricDetail}>{detail}</span>}
    </article>
  );
}
