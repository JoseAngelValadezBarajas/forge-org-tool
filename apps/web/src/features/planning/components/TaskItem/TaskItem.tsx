import type { Task } from '@forge-org/api-client';
import { ButtonV2, CheckboxV2, SelectV2 } from '@corefoundry-labs/forge-ui';
import styles from './TaskItem.module.css';

type TaskItemProps = {
  task: Task;
  onStatusChange: (status: Task['status']) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  editing?: boolean;
  archived?: boolean;
  compact?: boolean;
};

export function TaskItem({
  task,
  onStatusChange,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  editing = false,
  archived = false,
  compact = false,
}: TaskItemProps) {
  const state = archived
    ? 'Archived'
    : editing
      ? 'Editing'
      : task.status === 'in_progress'
        ? 'InProgress'
        : task.status === 'done'
          ? 'Done'
          : 'Todo';
  return (
    <article
      className={[styles.item, compact && styles.compact].filter(Boolean).join(' ')}
      data-state={state}
    >
      {compact && (
        <CheckboxV2
          aria-label={`Complete ${task.title}`}
          checked={task.status === 'done'}
          disabled={archived}
          onChange={(event) => onStatusChange(event.target.checked ? 'done' : 'todo')}
        />
      )}
      <strong className={styles.title}>{task.title}</strong>
      <SelectV2
        size="sm"
        aria-label={`Status for ${task.title}`}
        value={task.status}
        disabled={archived}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="todo">todo</option>
        <option value="in_progress">in progress</option>
        <option value="done">done</option>
      </SelectV2>
      <div className={styles.actions}>
        <ButtonV2
          type="button"
          variant="secondary"
          disabled={isFirst || archived}
          onClick={onMoveUp}
          aria-label={`Move ${task.title} up`}
        >
          Move up
        </ButtonV2>
        <ButtonV2
          type="button"
          variant="secondary"
          disabled={isLast || archived}
          onClick={onMoveDown}
          aria-label={`Move ${task.title} down`}
        >
          Move down
        </ButtonV2>
      </div>
    </article>
  );
}
