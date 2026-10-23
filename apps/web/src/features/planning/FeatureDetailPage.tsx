import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { Badge, Button, Card, Input, StatusChip, Textarea } from '@forge-org/ui';
import styles from './FeatureDetailPage.module.css';
import { useFeatureDetailController } from './useFeatureDetailController';
import { CriterionItem, TaskItem } from './components';

const titleCase = (value?: string | null) => (value ? value.replaceAll('_', ' ') : 'Unknown');

export function FeatureDetailPage() {
  const [editing, setEditing] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [criterionDraft, setCriterionDraft] = useState('');
  const [screenshotPickerError, setScreenshotPickerError] = useState<string | null>(null);
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
    workspaceTags,
    uploadAttachment,
    removeAttachment,
    featureName,
    moveTask,
    saveFeature,
    reload,
    setCriterion,
    setFeatureTitle,
    setFeatureDescription,
    setFeatureGoal,
    setTaskTitle,
    taskTitle,
    tasks,
  } = useFeatureDetailController(workspaceId, projectId, featureId);

  async function chooseBugScreenshot() {
    setScreenshotPickerError(null);
    if (!isTauri()) {
      bugScreenshotInput.current?.click();
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (!selected || Array.isArray(selected)) return;

      const fileName = selected.split(/[\\/]/).pop() || 'screenshot';
      const extension = fileName.split('.').pop()?.toLowerCase();
      const contentType =
        extension === 'png'
          ? 'image/png'
          : extension === 'jpg' || extension === 'jpeg'
            ? 'image/jpeg'
            : extension === 'webp'
              ? 'image/webp'
              : null;
      if (!contentType) {
        setScreenshotPickerError('Choose a PNG, JPEG, or WebP screenshot.');
        return;
      }

      const selectedBytes = await readFile(selected);
      const bytes = new Uint8Array(selectedBytes.length);
      bytes.set(selectedBytes);
      await uploadAttachment(new File([bytes.buffer], fileName, { type: contentType }));
    } catch {
      setScreenshotPickerError('Unable to select or read screenshot.');
    }
  }

  function toggleTag(tagName: string, checked: boolean) {
    const selected = new Set(
      featureTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
    if (checked) selected.add(tagName);
    else selected.delete(tagName);
    setFeatureTags([...selected].join(', '));
  }

  async function submitFeature(event: FormEvent) {
    if (await saveFeature(event)) setEditing(false);
  }

  const archived = Boolean(feature?.archived_at);
  const selectedTags = featureTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const knownTags = new Set(workspaceTags.map((tag) => tag.name));
  const legacyTags = selectedTags.filter((tag) => !knownTags.has(tag));

  return (
    <main className={styles.page}>
      <header className={styles.detailHeader}>
        <div>
          <p className={styles.eyebrow}>
            FORGE / {feature?.kind === 'bug' ? 'Bug report' : 'User story'}
          </p>
          <h1>{feature?.title ?? 'Work item detail'}</h1>
        </div>
        {feature && !editing && !archived && (
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        )}
      </header>
      <p className={styles.disclaimer}>
        Planning records describe intended work; status changes do not claim execution or delivery.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {feature && (
        <nav className={styles.breadcrumbs} aria-label="Work item navigation">
          <Link to={`/planning/${workspaceId}/${projectId}`}>Project board</Link>
          <span aria-hidden="true">/</span>
          {feature.epic_id ? (
            <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
              Epic board
            </Link>
          ) : (
            <span>Unassigned work</span>
          )}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{feature.title}</span>
          <Link
            className={styles.transferLink}
            to={`/transfer/${workspaceId}/${projectId}/tasks/${feature.id}`}
          >
            Import / export Tasks
          </Link>
        </nav>
      )}

      {archived && (
        <p role="status" className={styles.archived}>
          Archived work item · read-only
        </p>
      )}

      {feature && (
        <div className={styles.layout}>
          <div className={styles.content}>
            <Card>
              {editing ? (
                <form className={styles.editForm} onSubmit={(event) => void submitFeature(event)}>
                  <label htmlFor="feature-detail-title">Title</label>
                  <Input
                    id="feature-detail-title"
                    aria-label="Edit feature title"
                    value={featureTitle}
                    onChange={(event) => setFeatureTitle(event.target.value)}
                    required
                  />
                  <label htmlFor="feature-detail-description">Description</label>
                  <Textarea
                    id="feature-detail-description"
                    aria-label="Edit feature description"
                    value={featureDescription}
                    onChange={(event) => setFeatureDescription(event.target.value)}
                    rows={4}
                  />
                  <label htmlFor="feature-detail-goal">Goal</label>
                  <Textarea
                    id="feature-detail-goal"
                    aria-label="Edit feature goal"
                    value={featureGoal}
                    onChange={(event) => setFeatureGoal(event.target.value)}
                    rows={3}
                  />
                  <label htmlFor="feature-detail-notes">Notes</label>
                  <Textarea
                    id="feature-detail-notes"
                    aria-label="Work item notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={5}
                  />
                  {feature.kind === 'bug' && (
                    <section className={styles.editSection} aria-label="Bug details">
                      <label htmlFor="bug-severity">Severity</label>
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
                        rows={4}
                      />
                      <label htmlFor="expected-result">Expected result</label>
                      <Textarea
                        id="expected-result"
                        aria-label="Expected result"
                        value={expectedResult}
                        onChange={(event) => setExpectedResult(event.target.value)}
                        rows={3}
                      />
                      <label htmlFor="actual-result">Actual result</label>
                      <Textarea
                        id="actual-result"
                        aria-label="Actual result"
                        value={actualResult}
                        onChange={(event) => setActualResult(event.target.value)}
                        rows={3}
                      />
                    </section>
                  )}
                  <fieldset className={styles.tagPicker}>
                    <legend>Workspace tags</legend>
                    {workspaceTags.length ? (
                      workspaceTags.map((tag) => (
                        <label key={tag.id} className={styles.checkTag}>
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.name)}
                            onChange={(event) => toggleTag(tag.name, event.target.checked)}
                          />
                          <span>{tag.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className={styles.muted}>No workspace tags are available.</p>
                    )}
                    {legacyTags.length > 0 && (
                      <p className={styles.muted}>
                        Existing tags outside the catalog are preserved: {legacyTags.join(', ')}
                      </p>
                    )}
                  </fieldset>
                  <div className={styles.actions}>
                    <Button type="submit">Save changes</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        void reload();
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <section
                    className={styles.readSection}
                    aria-labelledby="feature-description-heading"
                  >
                    <h2 id="feature-description-heading">Description</h2>
                    {feature.description ? (
                      <p className={styles.description}>{feature.description}</p>
                    ) : (
                      <p className={styles.muted}>No description yet.</p>
                    )}
                  </section>
                  {feature.goal && (
                    <section className={styles.readSection}>
                      <h2>Goal</h2>
                      <p>{feature.goal}</p>
                    </section>
                  )}
                  {feature.kind === 'bug' && (
                    <section className={styles.bugDetails} aria-label="Bug report details">
                      <h2>Reproduction</h2>
                      <div className={styles.proseBlock}>
                        <h3>Steps to reproduce</h3>
                        <p>{feature.steps_to_reproduce || 'Not provided.'}</p>
                      </div>
                      <div className={styles.resultGrid}>
                        <div className={styles.proseBlock}>
                          <h3>Expected result</h3>
                          <p>{feature.expected_result || 'Not provided.'}</p>
                        </div>
                        <div className={styles.proseBlock}>
                          <h3>Actual result</h3>
                          <p>{feature.actual_result || 'Not provided.'}</p>
                        </div>
                      </div>
                    </section>
                  )}
                  <section className={styles.readSection} aria-labelledby="notes-heading">
                    <h2 id="notes-heading">Notes</h2>
                    {feature.notes ? (
                      <p className={styles.preformatted}>{feature.notes}</p>
                    ) : (
                      <p className={styles.muted}>No notes yet.</p>
                    )}
                  </section>
                </>
              )}

              <section
                className={styles.attachmentSection}
                aria-labelledby="bug-screenshots-heading"
              >
                <div className={styles.sectionHeading}>
                  <div>
                    <h2 id="bug-screenshots-heading">Screenshots</h2>
                    <p className={styles.muted}>Evidence is stored with this Bug.</p>
                  </div>
                  {feature.kind === 'bug' && !archived && (
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label="Add Bug screenshot"
                      onClick={() => void chooseBugScreenshot()}
                      disabled={attachments.length >= 5}
                    >
                      Add screenshot
                    </Button>
                  )}
                </div>
                <input
                  ref={bugScreenshotInput}
                  id="bug-screenshot"
                  className={styles.visuallyHidden}
                  tabIndex={-1}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Choose Bug screenshot"
                  disabled={attachments.length >= 5 || archived}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadAttachment(file);
                    event.currentTarget.value = '';
                  }}
                />
                {screenshotPickerError && <p role="alert">{screenshotPickerError}</p>}
                {feature.kind !== 'bug' ? (
                  <p className={styles.muted}>Screenshots are available for Bugs.</p>
                ) : attachments.length === 0 ? (
                  <p className={styles.muted}>No screenshots attached.</p>
                ) : (
                  <ul className={styles.attachmentGrid}>
                    {attachments.map((attachment) => {
                      const contentUrl = `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments/${attachment.id}/content`;
                      return (
                        <li key={attachment.id} className={styles.attachment}>
                          <a href={contentUrl} target="_blank" rel="noreferrer">
                            <img src={contentUrl} alt={`Bug screenshot: ${attachment.file_name}`} />
                            <span>{attachment.file_name}</span>
                          </a>
                          {!archived && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void removeAttachment(attachment.id)}
                            >
                              Remove {attachment.file_name}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </Card>

            <Card>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Acceptance criteria</h2>
                  <p className={styles.muted}>
                    {criteria.filter((item) => item.satisfied).length} of {criteria.length}{' '}
                    satisfied
                  </p>
                </div>
              </div>
              {criteria.length === 0 ? (
                <p className={styles.muted}>No acceptance criteria yet.</p>
              ) : (
                <ul className={styles.list}>
                  {criteria.map((item, index) => (
                    <CriterionItem key={item.id} criterion={item}>
                      {editingCriterionId === item.id ? (
                        <div className={styles.inlineEditor}>
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
                        </div>
                      ) : (
                        !archived && (
                          <div className={styles.inlineActions}>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                void updateCriterion(item.id, { satisfied: !item.satisfied })
                              }
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
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={index === 0}
                              onClick={() => void moveCriterion(index, -1)}
                            >
                              Move up
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={index === criteria.length - 1}
                              onClick={() => void moveCriterion(index, 1)}
                            >
                              Move down
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void removeCriterion(item.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )
                      )}
                    </CriterionItem>
                  ))}
                </ul>
              )}
              {!archived && (
                <details className={styles.addDetails}>
                  <summary>Add acceptance criterion</summary>
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
                </details>
              )}
            </Card>

            <Card>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Tasks</h2>
                  <p className={styles.muted}>
                    {tasks.filter((task) => task.status === 'done').length} of {tasks.length}{' '}
                    complete
                  </p>
                </div>
              </div>
              {tasks.length === 0 ? (
                <p className={styles.muted}>No tasks yet.</p>
              ) : (
                <div className={styles.taskList}>
                  {tasks.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isFirst={index === 0}
                      isLast={index === tasks.length - 1}
                      archived={archived}
                      onStatusChange={(status) => void changeTask(task, status)}
                      onMoveUp={() => void moveTask(index, -1)}
                      onMoveDown={() => void moveTask(index, 1)}
                    />
                  ))}
                </div>
              )}
              {!archived && (
                <details className={styles.addDetails}>
                  <summary>Add task</summary>
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
                </details>
              )}
            </Card>
          </div>

          <aside className={styles.sidebar} aria-label="Work item properties">
            <Card>
              <h2>Properties</h2>
              <dl className={styles.properties}>
                <div>
                  <dt>Type</dt>
                  <dd>{feature.kind === 'bug' ? 'Bug' : 'User Story'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusChip
                      tone={
                        feature.status === 'done'
                          ? 'success'
                          : feature.status === 'in_progress'
                            ? 'accent'
                            : 'neutral'
                      }
                    >
                      {titleCase(feature.status)}
                    </StatusChip>
                  </dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>
                    <Badge
                      tone={
                        feature.priority === 'critical' || feature.priority === 'high'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {titleCase(feature.priority)}
                    </Badge>
                  </dd>
                </div>
                {feature.kind === 'bug' && (
                  <div>
                    <dt>Severity</dt>
                    <dd>{titleCase(feature.bug_severity ?? 'medium')}</dd>
                  </div>
                )}
                <div>
                  <dt>Tags</dt>
                  <dd className={styles.tags}>
                    {selectedTags.length ? (
                      selectedTags.map((tag) => (
                        <Badge key={tag} tone={knownTags.has(tag) ? 'accent' : 'neutral'}>
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className={styles.muted}>No tags</span>
                    )}
                  </dd>
                </div>
              </dl>
              {feature.epic_id && (
                <p className={styles.parentLink}>
                  Parent Epic:{' '}
                  <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
                    {featureName(feature.epic_id)}
                  </Link>
                </p>
              )}
            </Card>
            {dependencies.length > 0 && (
              <Card>
                <h2>Dependencies</h2>
                <ul className={styles.dependencies}>
                  {dependencies.map((item) => (
                    <li key={item.id}>
                      {featureName(item.blocking_feature_id)} blocks{' '}
                      {featureName(item.blocked_feature_id)}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
