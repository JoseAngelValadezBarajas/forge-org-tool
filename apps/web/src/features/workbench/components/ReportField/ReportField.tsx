import { Card } from '@forge-org/ui';
import styles from './ReportField.module.css';
export interface ReportFieldProps {
  label: string;
  value: React.ReactNode;
}
export function ReportField({ label, value }: ReportFieldProps) {
  return (
    <Card className={styles.field}>
      <div role="group" aria-label={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>Reported</small>
      </div>
    </Card>
  );
}
