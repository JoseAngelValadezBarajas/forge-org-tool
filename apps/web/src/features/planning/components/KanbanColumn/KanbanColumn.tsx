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
  compact?: boolean;
  headerCount?: number;
  onDrop?: (event: React.DragEvent<HTMLElement>, status: PlanningColumnStatus) => void;
};

export function KanbanColumn({
  status,
  children,
  emptyMessage = 'No features in this status.',
  compact = false,
  headerCount,
  onDrop,
}: KanbanColumnProps) {
  const empty = Children.count(children) === 0;
  return (
    <section
      aria-labelledby={`planning-column-${status}`}
      data-testid={`kanban-column-${status}`}
      className={[styles.column, compact && styles.compact].filter(Boolean).join(' ')}
      onDragOver={(event) => {
        if (onDrop) event.preventDefault();
      }}
      onDragEnter={(event) => {
        if (onDrop) event.preventDefault();
      }}
      onDrop={(event) => onDrop?.(event, status)}
    >
      <Card
        className={[styles.surface, compact && styles.compactSurface].filter(Boolean).join(' ')}
      >
        <h3
          id={`planning-column-${status}`}
          className={[styles.heading, compact && styles.compactHeading].filter(Boolean).join(' ')}
        >
          <span>{PLANNING_COLUMN_STATUSES.find((column) => column.value === status)?.label}</span>
          {compact && (
            <span className={styles.count} aria-hidden="true">
              {String(headerCount ?? 0).padStart(2, '0')}
            </span>
          )}
        </h3>
        <div className={styles.cards} data-state={empty ? 'Empty' : 'HasCards'}>
          {empty ? <p className={styles.empty}>{emptyMessage}</p> : children}
        </div>
      </Card>
    </section>
  );
}
