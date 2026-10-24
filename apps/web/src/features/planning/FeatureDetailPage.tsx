import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { Badge, Button, Card, Dialog, Input, Select, Textarea } from '@forge-org/ui';
import { organizationApi, type Feature } from '@forge-org/api-client';
import { PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
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
  const isBug = feature?.kind === 'bug';
  const selectedTags = featureTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const knownTags = new Set(workspaceTags.map((tag) => tag.name));
  const legacyTags = selectedTags.filter((tag) => !knownTags.has(tag));
  const [parentEpic, setParentEpic] = useState<{ id: string; title: string } | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const activeFeature = useRef(featureId);
  useEffect(() => {
    activeFeature.current = featureId;
  }, [featureId]);
  const parentId = feature?.epic_id;
  useEffect(() => {
    if (!parentId) return;
    let current = true;
    void organizationApi
      .planningOverview(workspaceId, projectId)
      .then((overview) => {
        const parent = overview.epics.find((item) => item.id === parentId);
        if (current && parent) setParentEpic({ id: parent.id, title: parent.title });
      })
      .catch(() => {
        /* Navigation remains available if the summary cannot load. */
      });
    return () => {
      current = false;
    };
  }, [workspaceId, projectId, parentId]);
  const epicName = parentEpic?.id === parentId ? parentEpic?.title : 'Epic board';
  async function moveStatus(status: Feature['status']) {
    if (!feature || archived || moving || editing || status === feature.status) return;
    const id = feature.id;
    setMoving(true);
    setMoveError('');
    try {
      await organizationApi.updateFeature(workspaceId, projectId, id, { status });
      if (activeFeature.current === id) await reload();
    } catch (cause) {
      if (activeFeature.current === id)
        setMoveError(cause instanceof Error ? cause.message : 'Unable to move work item.');
    } finally {
      if (activeFeature.current === id) setMoving(false);
    }
  }

  const criteriaPanel = (
    <Card as="section" aria-label="Acceptance criteria" className={styles.criteriaCard}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>
            Acceptance criteria{' '}
            <span className={styles.count}>
              {criteria.filter((item) => item.satisfied).length} / {criteria.length}
            </span>
          </h2>
        </div>
      </div>
      {criteria.length === 0 ? (
        <p className={styles.muted}>No acceptance criteria yet.</p>
      ) : (
        <ul className={styles.list}>
          {criteria.map((item, index) => (
            <CriterionItem
              key={item.id}
              criterion={item}
              compact
              archived={archived}
              onSatisfiedChange={(satisfied) => void updateCriterion(item.id, { satisfied })}
            >
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
                    <details className={styles.criterionMoreActions}>
                      <summary>More criterion actions</summary>
                      <div className={styles.criterionMoreActionsMenu}>
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
                    </details>
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
  );
  const tasksPanel = (
    <Card as="section" aria-label="Tasks" className={styles.tasksCard}>
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
  );
  return (
    <section
      className={[styles.page, isBug && styles.bugPage].filter(Boolean).join(' ')}
      aria-label={isBug ? 'Bug detail' : 'Story detail'}
    >
      <header className={styles.detailHeader}>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>{isBug ? 'Bug report' : 'User story'}</p>
          <h1>{feature?.title ?? 'Work item detail'}</h1>
          <p className={styles.subtitle}>
            {feature?.epic_id ? (
              <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
                {epicName}
              </Link>
            ) : (
              'Unassigned work'
            )}
            {feature && <> · {titleCase(feature.status)}</>}
          </p>
        </div>
        {feature && !archived && (
          <Button
            className={styles.editAction}
            aria-label="Edit details"
            disabled={moving}
            onClick={() => setEditing(true)}
          >
            {isBug ? 'Edit Bug' : 'Edit Story'}
          </Button>
        )}
      </header>
      {feature && (
        <div className={styles.metadata} aria-label="Work item metadata">
          <Select
            aria-label="Work item status"
            value={feature.status ?? 'backlog'}
            disabled={archived || moving || editing}
            onChange={(event) => void moveStatus(event.target.value as Feature['status'])}
          >
            {!PLANNING_COLUMN_STATUSES.some((item) => item.value === feature.status) && (
              <option value={feature.status}>{titleCase(feature.status)}</option>
            )}
            {PLANNING_COLUMN_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          {isBug && (
            <Badge className={styles.pill}>
              {titleCase(feature.bug_severity ?? 'medium')} severity
            </Badge>
          )}
          <Badge className={styles.pill}>{titleCase(feature.priority)} priority</Badge>
          {selectedTags.map((tag) => (
            <Badge className={styles.pill} key={tag}>
              {tag}
            </Badge>
          ))}
          <details className={styles.moreActions}>
            <summary>⋯ More</summary>
            <nav aria-label="Work item navigation">
              <Link to={`/planning/${workspaceId}/${projectId}`}>Project board</Link>
              {feature.epic_id && (
                <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
                  Epic board
                </Link>
              )}
              <Link to={`/transfer/${workspaceId}/${projectId}/tasks/${feature.id}`}>
                Import / export Tasks
              </Link>
            </nav>
          </details>
        </div>
      )}
      {(error || moveError) && (
        <p role="alert" className={styles.error}>
          {error || moveError}
        </p>
      )}
      {archived && (
        <p role="status" className={styles.archived}>
          Archived work item · read-only
        </p>
      )}
      {feature && (
        <>
          {editing && (
            <Dialog
              title={isBug ? 'Edit Bug' : 'Edit Story'}
              open
              onCancel={() => {
                void reload();
                setEditing(false);
              }}
            >
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
            </Dialog>
          )}
          <div className={styles.layout}>
            <div className={styles.content}>
              {isBug ? (
                <>
                  <Card as="section" aria-label="How to reproduce" className={styles.reproduction}>
                    <h2>How to reproduce</h2>
                    {feature.steps_to_reproduce ? (
                      <ol className={styles.steps}>
                        {feature.steps_to_reproduce
                          .split('\n')
                          .filter((line: string) => line.trim())
                          .map((step: string, index: number) => (
                            <li key={index}>{step.replace(/^\s*\d+[.)]\s*/, '')}</li>
                          ))}
                      </ol>
                    ) : (
                      <p>Not provided.</p>
                    )}
                    {feature.description && <p>{feature.description}</p>}
                    {feature.goal && (
                      <section>
                        <h3>Goal</h3>
                        <p>{feature.goal}</p>
                      </section>
                    )}
                  </Card>
                  <div className={styles.resultGrid}>
                    <Card as="section" aria-label="Actual result" className={styles.actual}>
                      <h2>Actual result</h2>
                      <p>{feature.actual_result || 'Not provided.'}</p>
                    </Card>
                    <Card as="section" aria-label="Expected result" className={styles.expected}>
                      <h2>Expected result</h2>
                      <p>{feature.expected_result || 'Not provided.'}</p>
                    </Card>
                  </div>
                </>
              ) : (
                <>
                  <Card as="section" aria-label="Description" className={styles.descriptionCard}>
                    <h2>Description</h2>
                    <p>{feature.description || 'No description yet.'}</p>
                    {feature.goal && (
                      <section>
                        <h3>Goal</h3>
                        <p>{feature.goal}</p>
                      </section>
                    )}
                  </Card>
                  {criteriaPanel}
                </>
              )}
              <Card as="section" aria-label="Notes" className={styles.notesCard}>
                <h2>Notes</h2>
                <p>{feature.notes || 'No notes yet.'}</p>
              </Card>
              {isBug && (
                <details className={styles.extraDetails}>
                  <summary>Acceptance criteria</summary>
                  {criteriaPanel}
                </details>
              )}
            </div>
            <aside
              className={styles.sidebar}
              aria-label={isBug ? 'Bug evidence' : 'Work item properties'}
            >
              {isBug ? (
                <>
                  <Card as="section" aria-label="Screenshots" className={styles.screenshotsCard}>
                    <h2>
                      Screenshots{' '}
                      <span className={styles.count}>
                        · {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    </h2>
                    {attachments.length === 0 ? (
                      <p>No screenshots attached.</p>
                    ) : (
                      <ul className={styles.attachmentGrid}>
                        {attachments.map((attachment) => {
                          const contentUrl = `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments/${attachment.id}/content`;
                          return (
                            <li key={attachment.id} className={styles.attachment}>
                              <a href={contentUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={contentUrl}
                                  alt={`Bug screenshot: ${attachment.file_name}`}
                                />
                                <span>{attachment.file_name}</span>
                              </a>
                              {!archived && (
                                <Button
                                  variant="ghost"
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
                  </Card>
                  <Card
                    as="section"
                    aria-label="Attach another screenshot"
                    className={styles.uploadCard}
                  >
                    <h2>Attach another screenshot</h2>
                    <p>PNG, JPG or WebP · up to 5 MB</p>
                    {!archived && (
                      <Button
                        variant="secondary"
                        className={styles.chooseImage}
                        aria-label="Add Bug screenshot"
                        disabled={attachments.length >= 5}
                        onClick={() => void chooseBugScreenshot()}
                      >
                        + Choose image
                      </Button>
                    )}
                    <input
                      ref={bugScreenshotInput}
                      className={styles.visuallyHidden}
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
                  </Card>
                  <Card as="section" aria-label="Properties" className={styles.bugProperties}>
                    <h2>
                      {selectedTags.join(', ') || 'Bug'} · {titleCase(feature.priority)}
                    </h2>
                    <p>
                      <span>{titleCase(feature.status)}</span> · Severity:{' '}
                      <span>{titleCase(feature.bug_severity)}</span>
                    </p>
                    {feature.epic_id && (
                      <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
                        {epicName}
                      </Link>
                    )}
                  </Card>
                  <details className={styles.extraDetails}>
                    <summary>Tasks</summary>
                    {tasksPanel}
                  </details>
                </>
              ) : (
                <>
                  <Card as="section" aria-label="Properties" className={styles.propertiesCard}>
                    <h2>Properties</h2>
                    <dl className={styles.properties}>
                      <div>
                        <dt>Epic</dt>
                        <dd>
                          {feature.epic_id ? (
                            <Link
                              to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}
                            >
                              {epicName}
                            </Link>
                          ) : (
                            'Unassigned'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{titleCase(feature.status)}</dd>
                      </div>
                      <div>
                        <dt>Priority</dt>
                        <dd>{titleCase(feature.priority)}</dd>
                      </div>
                      <div>
                        <dt>Tags</dt>
                        <dd>{selectedTags.length ? selectedTags.join(', ') : 'No tags'}</dd>
                      </div>
                    </dl>
                  </Card>
                  {tasksPanel}
                  <Card as="section" aria-label="Quick actions" className={styles.quickActions}>
                    <h2>Quick actions</h2>
                    {feature.epic_id && (
                      <Link
                        to={`/transfer/${workspaceId}/${projectId}/work-items/${feature.epic_id}`}
                      >
                        Export Work Items ↗
                      </Link>
                    )}
                    <Link to={`/transfer/${workspaceId}/${projectId}/tasks/${feature.id}`}>
                      Import / export Tasks ↗
                    </Link>
                  </Card>
                </>
              )}
              {dependencies.length > 0 && (
                <Card as="section" aria-label="Dependencies" className={styles.dependencies}>
                  <h2>Dependencies</h2>
                  <ul>
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
        </>
      )}
      <p className={styles.disclaimer}>
        Planning records describe intended work; status changes do not claim execution or delivery.
      </p>
    </section>
  );
}
