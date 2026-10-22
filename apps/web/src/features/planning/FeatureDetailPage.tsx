import { Link, useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, Textarea } from '@forge-org/ui';
import styles from './PlanningPage.module.css';
import { useFeatureDetailController } from './useFeatureDetailController';
import { CriterionItem, FeatureOverview, TaskItem } from './components';

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
    feature,
    featureDescription,
    featureGoal,
    featureTitle,
    featureName,
    moveTask,
    readiness,
    saveFeature,
    setCriterion,
    setFeatureTitle,
    setFeatureDescription,
    setFeatureGoal,
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
      {feature && (
        <Card>
          <form onSubmit={saveFeature} className={styles.featureForm}>
            <label htmlFor="feature-detail-title">Feature title</label>
            <Input
              id="feature-detail-title"
              aria-label="Edit feature title"
              value={featureTitle}
              onChange={(event) => setFeatureTitle(event.target.value)}
              required
            />
            <label htmlFor="feature-detail-description">Feature description</label>
            <Textarea
              id="feature-detail-description"
              aria-label="Edit feature description"
              value={featureDescription}
              onChange={(event) => setFeatureDescription(event.target.value)}
              rows={3}
            />
            <label htmlFor="feature-detail-goal">Feature goal</label>
            <Textarea
              id="feature-detail-goal"
              aria-label="Edit feature goal"
              value={featureGoal}
              onChange={(event) => setFeatureGoal(event.target.value)}
              rows={3}
            />
            <Button type="submit">Save feature</Button>
          </form>
        </Card>
      )}
      <FeatureOverview result={readiness}>
        <Link to={`/readiness/${workspaceId}/${projectId}/${featureId}`}>Manage readiness</Link>
      </FeatureOverview>
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
            <TaskItem
              key={task.id}
              task={task}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              onStatusChange={(status) => void changeTask(task, status)}
              onMoveUp={() => void moveTask(index, -1)}
              onMoveDown={() => void moveTask(index, 1)}
            />
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
              <CriterionItem key={item.id} criterion={item} />
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
                {featureName(item.blocking_feature_id)} blocks{' '}
                {featureName(item.blocked_feature_id)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
