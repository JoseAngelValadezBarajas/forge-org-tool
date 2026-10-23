import { Children, type ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './KanbanColumn.module.css';

export const PLANNING_COLUMN_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'verify', label: 'Verify' },
  { value: 'done', label: 'Done' },
] as const;
export type PlanningColumnStatus = (typeof PLANNING_COLUMN_STATUSES)[number]['value'];
type KanbanColumnProps = {
  status: PlanningColumnStatus;
  children?: ReactNode;
  emptyMessage?: string;
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
          {PLANNING_COLUMN_STATUSES.find((column) => column.value === status)?.label}
        </h3>
        <div className={styles.cards} data-state={empty ? 'Empty' : 'HasCards'}>
          {empty ? <p className={styles.empty}>{emptyMessage}</p> : children}
        </div>
      </Card>
    </section>
  );
}
