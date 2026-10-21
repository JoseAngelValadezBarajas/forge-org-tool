import { Card, StatusChip } from '@forge-org/ui';
import styles from './InvariantCard.module.css';

export interface InvariantCardProps {
  title: string;
  revision: number;
  acknowledgedRevision: number | null;
  children?: React.ReactNode;
}

export function InvariantCard({
  title,
  revision,
  acknowledgedRevision,
  children,
}: InvariantCardProps) {
  const acknowledged = acknowledgedRevision === revision;
  return (
    <Card className={styles.invariant}>
      <article aria-label={title}>
        <header>
          <div>
            <h4>
              <strong>{title}</strong>
            </h4>
            <p>Revision {revision}</p>
          </div>
          <StatusChip tone={acknowledged ? 'success' : 'warning'}>
            {acknowledged ? `Acknowledged revision ${revision}` : 'Current'}
          </StatusChip>
        </header>
        {!acknowledged && (
          <p className={styles.notice}>Acknowledgement required for current revision</p>
        )}
        {children && <footer>{children}</footer>}
      </article>
    </Card>
  );
}
