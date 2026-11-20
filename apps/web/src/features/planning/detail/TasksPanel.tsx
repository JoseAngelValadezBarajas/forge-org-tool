import { CardV2, ButtonV2, TextInputV2 } from '@corefoundry-labs/forge-ui';
import { TaskItem } from '../components';
import styles from '../FeatureDetailPage.module.css';
import type { FeatureDetailModel } from './model';

type Props = Pick<
  FeatureDetailModel,
  | 'tasks'
  | 'archived'
  | 'changeTask'
  | 'moveTask'
  | 'addTask'
  | 'taskTitle'
  | 'setTaskTitle'
  | 'renameTask'
  | 'deleteTask'
  | 'removedTask'
  | 'undoDeleteTask'
  | 'dismissRemovedTask'
>;

export function TasksPanel({
  tasks,
  archived,
  changeTask,
  moveTask,
  addTask,
  taskTitle,
  setTaskTitle,
  renameTask,
  deleteTask,
  removedTask,
  undoDeleteTask,
  dismissRemovedTask,
}: Props) {
  return (
    <CardV2 variant="outlined" as="section" aria-label="Tasks" className={styles.tasksCard}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>
            Tasks{' '}
            <span className={styles.count}>
              · {tasks.filter((task) => task.status === 'done').length} / {tasks.length}
            </span>
          </h2>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className={styles.muted}>No tasks yet.</p>
      ) : (
        <div className={styles.taskList}>
          {tasks.map((task, index) => (
            <TaskItem
              compact
              key={task.id}
              task={task}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              archived={archived}
              onStatusChange={(status) => void changeTask(task, status)}
              onMoveUp={() => void moveTask(index, -1)}
              onMoveDown={() => void moveTask(index, 1)}
              onRename={(title) => void renameTask(task, title)}
              onDelete={() => void deleteTask(task)}
            />
          ))}
        </div>
      )}
      {removedTask && (
        <p role="status" className={styles.muted}>
          Deleted “{removedTask.title}”{' '}
          <ButtonV2 variant="ghost" size="sm" onClick={() => void undoDeleteTask()}>
            Undo
          </ButtonV2>
          <ButtonV2 variant="ghost" size="sm" aria-label="Dismiss" onClick={dismissRemovedTask}>
            ×
          </ButtonV2>
        </p>
      )}
      {!archived && (
        <details className={styles.addDetails}>
          <summary>Add task</summary>
          <form onSubmit={addTask}>
            <label htmlFor="task-title">Task title</label>
            <TextInputV2
              id="task-title"
              aria-label="Task title"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              required
            />
            <ButtonV2 type="submit">Add task</ButtonV2>
          </form>
        </details>
      )}
    </CardV2>
  );
}
