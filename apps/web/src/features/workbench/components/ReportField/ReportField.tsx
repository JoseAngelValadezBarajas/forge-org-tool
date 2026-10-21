import type { ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './ReportField.module.css';
export interface ReportFieldProps {
  label: string;
  value?: ReactNode;
  description?: string;
}
function hasRenderableValue(value: ReactNode): boolean {
  if (value === null || value === undefined || typeof value === 'boolean' || value === '') {
    return false;
  }
  return Array.isArray(value) ? value.some(hasRenderableValue) : true;
}

export function ReportField({
  label,
  value,
  description = 'Operator-reported notes and run result',
}: ReportFieldProps) {
  const hasValue = hasRenderableValue(value);

  return (
    <Card className={styles.field}>
      <div
        className={styles.content}
        role="group"
        aria-label={label}
        data-state={hasValue ? 'HasValue' : 'Empty'}
      >
        <span className={styles.title}>{label}</span>
        <span className={styles.state}>{hasValue ? 'HAS VALUE' : 'EMPTY'}</span>
        {hasValue && <strong className={styles.value}>{value}</strong>}
        <p className={styles.description}>{description}</p>
        <small className={styles.provenance}>
          Reported · workbench/ReportField · no assumed proof
        </small>
      </div>
    </Card>
  );
}
