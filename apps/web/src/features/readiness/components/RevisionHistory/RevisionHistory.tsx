import { Card } from '@forge-org/ui';
import styles from './RevisionHistory.module.css';

export interface RevisionHistoryItem {
  revision: number;
  text: string;
  status?: 'Current' | 'Superseded';
}
export interface RevisionHistoryProps {
  title: string;
  revisions: RevisionHistoryItem[];
  currentRevision?: number;
}

export function RevisionHistory({ title, revisions, currentRevision }: RevisionHistoryProps) {
  // Decision revisions are persisted and returned in ascending revision order;
  // the newest revision is the current snapshot for existing callers.
  const latestRevision = currentRevision ?? Math.max(...revisions.map(({ revision }) => revision));

  return (
    <Card className={styles.history}>
      <section role="group" aria-label={title}>
        <h4>{title}</h4>
        {revisions.length === 0 ? (
          <p>No revisions loaded.</p>
        ) : (
          <ol>
            {revisions.map((item) => {
              const isCurrent =
                (item.status ?? (item.revision === latestRevision ? 'Current' : 'Superseded')) ===
                'Current';
              return (
                <li
                  key={item.revision}
                  className={isCurrent ? styles.current : styles.superseded}
                  data-state={isCurrent ? 'current' : 'superseded'}
                >
                  <span className={styles.revisionText}>
                    <span>Revision {item.revision}:</span> {item.text}
                  </span>
                  <span className={styles.status} aria-label={isCurrent ? 'Current' : 'Superseded'}>
                    {isCurrent ? 'CURRENT' : 'SUPERSEDED'}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </Card>
  );
}
