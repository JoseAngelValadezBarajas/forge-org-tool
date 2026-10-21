import type { ReactNode } from 'react';
import styles from './MetricCard.module.css';
export interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}
export function MetricCard({ label, value, detail, className }: MetricCardProps) {
  return (
    <article className={[styles.metric, className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
      {detail && <span className={styles.detail}>{detail}</span>}
    </article>
  );
}
