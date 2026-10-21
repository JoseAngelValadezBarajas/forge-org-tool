import { Children, type ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './KanbanColumn.module.css';

export type PlanningColumnStatus = 'backlog' | 'in_progress' | 'verify' | 'done';
type KanbanColumnProps = {
  status: PlanningColumnStatus;
  children?: ReactNode;
  emptyMessage?: string;
};

const labels: Record<PlanningColumnStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  verify: 'Verify',
  done: 'Done',
};

export function KanbanColumn({
  status,
  children,
  emptyMessage = 'No features in this status.',
}: KanbanColumnProps) {
  const empty = Children.count(children) === 0;
  return (
    <section aria-labelledby={`planning-column-${status}`} className={styles.column}>
      <Card className={styles.surface}>
        <h3 id={`planning-column-${status}`} className={styles.heading}>
          {labels[status]}
        </h3>
        <div className={styles.cards} data-state={empty ? 'Empty' : 'HasCards'}>
          {empty ? <p className={styles.empty}>{emptyMessage}</p> : children}
        </div>
      </Card>
    </section>
  );
}
