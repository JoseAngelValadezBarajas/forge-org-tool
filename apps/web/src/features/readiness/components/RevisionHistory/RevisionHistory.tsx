import { Card } from '@forge-org/ui';
import styles from './RevisionHistory.module.css';

export interface RevisionHistoryItem {
  revision: number;
  text: string;
}
export interface RevisionHistoryProps {
  title: string;
  revisions: RevisionHistoryItem[];
}

export function RevisionHistory({ title, revisions }: RevisionHistoryProps) {
  return (
    <Card className={styles.history}>
      <section role="group" aria-label={title}>
        <h4>{title}</h4>
        {revisions.length === 0 ? (
          <p>No revisions loaded.</p>
        ) : (
          <ol>
            {revisions.map((item) => (
              <li key={item.revision}>
                <span>Revision {item.revision}:</span> {item.text}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Card>
  );
}
