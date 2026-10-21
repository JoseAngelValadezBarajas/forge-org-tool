import { Card } from '@forge-org/ui';
import styles from './ProvenanceNotice.module.css';
export interface ProvenanceNoticeProps {
  source: string;
  children?: React.ReactNode;
}
export function ProvenanceNotice({ source, children }: ProvenanceNoticeProps) {
  return (
    <Card className={styles.notice}>
      <p role="note">
        <strong>Reported provenance:</strong> {source}. This information is not independently
        verified.{children && <> {children}</>}
      </p>
    </Card>
  );
}
