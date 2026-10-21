import { Link, useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import type { Task } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';
import { useFeatureDetailController } from './useFeatureDetailController';

export function FeatureDetailPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const {
    addCriterion,
    addTask,
    changeTask,
    criteria,
    criterion,
    dependencies,
    error,
    moveTask,
    setCriterion,
    setTaskTitle,
    taskTitle,
    tasks,
  } = useFeatureDetailController(workspaceId, projectId, featureId);
  return (
    <div className={styles.stack}>
      <SectionHeader title="Feature detail" eyebrow="FORGE / Manual planning" />
      <p>
        Tasks, criteria, and dependencies are planning records only; status changes do not claim
        execution or delivery.
      </p>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link to={`/planning/${workspaceId}/${projectId}`}>Back to planning board</Link> ·{' '}
        <Link to={`/context/${workspaceId}/${projectId}/${featureId}`}>Manage feature context</Link>
      </p>
      <div className={styles.forms}>
        <Card>
          <form onSubmit={addTask}>
            <label htmlFor="task-title">Task title</label>
            <Input
              id="task-title"
              aria-label="Task title"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              required
            />
            <Button type="submit">Add task</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={addCriterion}>
            <label htmlFor="criterion-title">Acceptance criterion</label>
            <Input
              id="criterion-title"
              aria-label="Acceptance criterion"
              value={criterion}
              onChange={(event) => setCriterion(event.target.value)}
              required
            />
            <Button type="submit">Add criterion</Button>
          </form>
        </Card>
      </div>
      <Card>
        <h3>Tasks</h3>
        {tasks.length === 0 ? (
          <p>No tasks.</p>
        ) : (
          tasks.map((task, index) => (
            <article className={styles.item} key={task.id}>
              <strong>{task.title}</strong>
              <select
                aria-label={`Status for ${task.title}`}
                value={task.status}
                onChange={(event) => void changeTask(task, event.target.value as Task['status'])}
              >
                <option value="todo">todo</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={index === 0}
                onClick={() => void moveTask(index, -1)}
                aria-label={`Move ${task.title} up`}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={index === tasks.length - 1}
                onClick={() => void moveTask(index, 1)}
                aria-label={`Move ${task.title} down`}
              >
                Move down
              </Button>
            </article>
          ))
        )}
      </Card>
      <Card>
        <h3>Acceptance criteria</h3>
        {criteria.length === 0 ? (
          <p>No acceptance criteria.</p>
        ) : (
          <ul>
            {criteria.map((item) => (
              <li key={item.id}>
                <StatusChip tone={item.satisfied ? 'success' : 'neutral'}>
                  {item.satisfied ? 'satisfied' : 'open'}
                </StatusChip>{' '}
                {item.description}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3>Dependencies</h3>
        {dependencies.length === 0 ? (
          <p>No project dependencies.</p>
        ) : (
          <ul>
            {dependencies.map((item) => (
              <li key={item.id}>
                {item.blocking_feature_id} blocks {item.blocked_feature_id}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
