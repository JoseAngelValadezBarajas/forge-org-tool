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
  const stale = acknowledgedRevision !== null && acknowledgedRevision !== revision;
  const state = stale ? 'Stale' : acknowledged ? 'Acknowledged' : 'Current';
  const tone = stale ? 'warning' : acknowledged ? 'success' : 'accent';
  const status = acknowledged ? `Acknowledged revision ${revision}` : stale ? 'STALE' : 'Current';
  return (
    <Card className={styles.invariant}>
      <article aria-label={title} data-state={state}>
        <header>
          <div>
            <h4>
              <strong>{title}</strong>
            </h4>
            <p>Revision {revision}</p>
          </div>
          <StatusChip tone={tone}>{status}</StatusChip>
        </header>
        {!acknowledged && (
          <p className={styles.notice}>Acknowledgement required for current revision</p>
        )}
        {children && <footer>{children}</footer>}
      </article>
    </Card>
  );
}
