import { Card, StatusChip } from '@forge-org/ui';
import styles from './DecisionCard.module.css';

export interface DecisionCardProps {
  title: string;
  revision: number;
  status: string;
  children?: React.ReactNode;
}

export function DecisionCard({ title, revision, status, children }: DecisionCardProps) {
  return (
    <Card className={styles.decision}>
      <article aria-label={title}>
        <header>
          <div>
            <h4>
              <strong>{title}</strong>
            </h4>
            <p>Revision {revision}</p>
          </div>
          <StatusChip tone={status === 'ACCEPTED' ? 'success' : 'warning'}>{status}</StatusChip>
        </header>
        {children && <footer>{children}</footer>}
      </article>
    </Card>
  );
}
