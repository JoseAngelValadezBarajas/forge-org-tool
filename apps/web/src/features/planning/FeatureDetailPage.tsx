import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, Textarea } from '@forge-org/ui';
import styles from './PlanningPage.module.css';
import { useFeatureDetailController } from './useFeatureDetailController';
import { CriterionItem, TaskItem } from './components';

export function FeatureDetailPage() {
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [criterionDraft, setCriterionDraft] = useState('');
  const bugScreenshotInput = useRef<HTMLInputElement>(null);
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const {
    addCriterion,
    updateCriterion,
    removeCriterion,
    moveCriterion,
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
    bugSeverity,
    setBugSeverity,
    stepsToReproduce,
    setStepsToReproduce,
    expectedResult,
    setExpectedResult,
    actualResult,
    setActualResult,
    featureTags,
    setFeatureTags,
    notes,
    setNotes,
    attachments,
    uploadAttachment,
    removeAttachment,
    featureName,
    moveTask,
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
        <Link to={`/planning/${workspaceId}/${projectId}`}>Back to planning board</Link>
        {feature && (
          <>
            {' · '}
            <Link to={`/transfer/${workspaceId}/${projectId}/tasks/${feature.id}`}>
              Import / export Tasks
            </Link>
          </>
        )}
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
            <label htmlFor="feature-detail-tags">Feature tags (comma-separated)</label>
            <Input
              id="feature-detail-tags"
              aria-label="Feature tags (comma-separated)"
              value={featureTags}
              onChange={(event) => setFeatureTags(event.target.value)}
            />
            {feature.kind === 'bug' && (
              <section aria-label="Bug details">
                <label htmlFor="bug-severity">Bug severity</label>
                <select
                  id="bug-severity"
                  aria-label="Bug severity"
                  value={bugSeverity}
                  onChange={(event) => setBugSeverity(event.target.value)}
                >
                  {['low', 'medium', 'high', 'critical'].map((severity) => (
                    <option key={severity}>{severity}</option>
                  ))}
                </select>
                <label htmlFor="steps-to-reproduce">Steps to reproduce</label>
                <Textarea
                  id="steps-to-reproduce"
                  aria-label="Steps to reproduce"
                  value={stepsToReproduce}
                  onChange={(event) => setStepsToReproduce(event.target.value)}
                  rows={3}
                />
                <label htmlFor="expected-result">Expected result</label>
                <Textarea
                  id="expected-result"
                  aria-label="Expected result"
                  value={expectedResult}
                  onChange={(event) => setExpectedResult(event.target.value)}
                  rows={2}
                />
                <label htmlFor="actual-result">Actual result</label>
                <Textarea
                  id="actual-result"
                  aria-label="Actual result"
                  value={actualResult}
                  onChange={(event) => setActualResult(event.target.value)}
                  rows={2}
                />
              </section>
            )}
            <label htmlFor="feature-detail-goal">Feature goal</label>
            <Textarea
              id="feature-detail-goal"
              aria-label="Edit feature goal"
              value={featureGoal}
              onChange={(event) => setFeatureGoal(event.target.value)}
              rows={3}
            />
            <label htmlFor="feature-detail-notes">Notes (plain text / Markdown)</label>
            <Textarea
              id="feature-detail-notes"
              aria-label="Work item notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
            />
            <Button type="submit">Save feature</Button>
          </form>
          {feature.kind === 'bug' && (
            <section aria-labelledby="bug-screenshots-heading">
              <h3 id="bug-screenshots-heading">Screenshots</h3>
              <Button
                type="button"
                variant="secondary"
                aria-label="Add Bug screenshot"
                onClick={() => bugScreenshotInput.current?.click()}
                disabled={attachments.length >= 5}
              >
                Add Bug screenshot
              </Button>
              <input
                ref={bugScreenshotInput}
                id="bug-screenshot"
                aria-label="Add Bug screenshot"
                aria-hidden="true"
                className={styles.visuallyHidden}
                tabIndex={-1}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={attachments.length >= 5}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void uploadAttachment(file);
                  event.currentTarget.value = '';
                }}
              />
              {attachments.length === 0 ? (
                <p>No screenshots attached.</p>
              ) : (
                <ul>
                  {attachments.map((attachment) => {
                    const contentUrl = `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments/${attachment.id}/content`;
                    return (
                      <li key={attachment.id}>
                        <a href={contentUrl} target="_blank" rel="noreferrer">
                          {attachment.file_name}
                        </a>
                        <img
                          src={contentUrl}
                          alt={`Bug screenshot: ${attachment.file_name}`}
                          width="240"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void removeAttachment(attachment.id)}
                        >
                          Remove {attachment.file_name}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </Card>
      )}
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
            {criteria.map((item, index) => (
              <CriterionItem key={item.id} criterion={item}>
                {editingCriterionId === item.id ? (
                  <>
                    <Input
                      aria-label={`Edit criterion ${item.description}`}
                      value={criterionDraft}
                      onChange={(event) => setCriterionDraft(event.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        void updateCriterion(item.id, { description: criterionDraft });
                        setEditingCriterionId(null);
                      }}
                    >
                      Save criterion
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingCriterionId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void updateCriterion(item.id, { satisfied: !item.satisfied })}
                    >
                      Mark {item.satisfied ? 'pending' : 'satisfied'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCriterionDraft(item.description);
                        setEditingCriterionId(item.id);
                      }}
                    >
                      Edit criterion
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={index === 0}
                      onClick={() => void moveCriterion(index, -1)}
                    >
                      Move criterion up
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={index === criteria.length - 1}
                      onClick={() => void moveCriterion(index, 1)}
                    >
                      Move criterion down
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void removeCriterion(item.id)}
                    >
                      Delete criterion
                    </Button>
                  </>
                )}
              </CriterionItem>
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
