import { Link } from 'react-router-dom';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  DialogV2,
  SelectV2,
  TextInputV2,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import { type Feature } from '@forge-org/api-client';
import { PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
import styles from './FeatureDetailPage.module.css';
import { CriterionItem, TaskItem } from './components';
import { useFeatureDetailPage } from './useFeatureDetailPage';

const titleCase = (value?: string | null) => (value ? value.replaceAll('_', ' ') : 'Unknown');
export function FeatureDetailPage() {
  const {
    editing,
    setEditing,
    editingCriterionId,
    setEditingCriterionId,
    criterionDraft,
    setCriterionDraft,
    screenshotPickerError,
    bugScreenshotInput,
    workspaceId,
    projectId,
    featureId,
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
    notes,
    setNotes,
    attachments,
    attachmentUrls,
    workspaceTags,
    uploadAttachment,
    removeAttachment,
    featureName,
    moveTask,
    reload,
    setCriterion,
    setFeatureTitle,
    setFeatureDescription,
    setFeatureGoal,
    setTaskTitle,
    taskTitle,
    tasks,
    chooseBugScreenshot,
    toggleTag,
    submitFeature,
    archived,
    isBug,
    selectedTags,
    legacyTags,
    moving,
    moveError,
    epicName,
    moveStatus,
  } = useFeatureDetailPage();

  const criteriaPanel = (
    <CardV2
      variant="outlined"
      as="section"
      aria-label="Acceptance criteria"
      className={styles.criteriaCard}
    >
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
                  <TextInputV2
                    aria-label={`Edit criterion ${item.description}`}
                    value={criterionDraft}
                    onChange={(event) => setCriterionDraft(event.target.value)}
                  />
                  <ButtonV2
                    type="button"
                    onClick={() => {
                      void updateCriterion(item.id, { description: criterionDraft });
                      setEditingCriterionId(null);
                    }}
                  >
                    Save criterion
                  </ButtonV2>
                  <ButtonV2
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingCriterionId(null)}
                  >
                    Cancel
                  </ButtonV2>
                </div>
              ) : (
                !archived && (
                  <div className={styles.inlineActions}>
                    <details className={styles.criterionMoreActions}>
                      <summary>More criterion actions</summary>
                      <div className={styles.criterionMoreActionsMenu}>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setCriterionDraft(item.description);
                            setEditingCriterionId(item.id);
                          }}
                        >
                          Edit
                        </ButtonV2>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          disabled={index === 0}
                          onClick={() => void moveCriterion(index, -1)}
                        >
                          Move up
                        </ButtonV2>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          disabled={index === criteria.length - 1}
                          onClick={() => void moveCriterion(index, 1)}
                        >
                          Move down
                        </ButtonV2>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          onClick={() => void removeCriterion(item.id)}
                        >
                          Delete
                        </ButtonV2>
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
            <TextInputV2
              id="criterion-title"
              aria-label="Acceptance criterion"
              value={criterion}
              onChange={(event) => setCriterion(event.target.value)}
              required
            />
            <ButtonV2 type="submit">Add criterion</ButtonV2>
          </form>
        </details>
      )}
    </CardV2>
  );
  const tasksPanel = (
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
            />
          ))}
        </div>
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
          <ButtonV2
            className={styles.editAction}
            aria-label="Edit details"
            disabled={moving}
            onClick={() => setEditing(true)}
          >
            {isBug ? 'Edit Bug' : 'Edit Story'}
          </ButtonV2>
        )}
      </header>
      {feature && (
        <div className={styles.metadata} aria-label="Work item metadata">
          <SelectV2
            size="sm"
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
          </SelectV2>
          {isBug && (
            <BadgeV2 className={styles.pill}>
              {titleCase(feature.bug_severity ?? 'medium')} severity
            </BadgeV2>
          )}
          <BadgeV2 className={styles.pill}>{titleCase(feature.priority)} priority</BadgeV2>
          {selectedTags.map((tag) => (
            <BadgeV2 className={styles.pill} key={tag}>
              {tag}
            </BadgeV2>
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
        <AlertV2 tone="error" className={styles.error}>
          {error || moveError}
        </AlertV2>
      )}
      {archived && (
        <AlertV2 tone="info" className={styles.archived}>
          Archived work item · read-only
        </AlertV2>
      )}
      {feature && (
        <>
          {editing && (
            <DialogV2
              onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                  void reload();
                  setEditing(false);
                }
              }}
              title={isBug ? 'Edit Bug' : 'Edit Story'}
              open
            >
              <form className={styles.editForm} onSubmit={(event) => void submitFeature(event)}>
                <label htmlFor="feature-detail-title">Title</label>
                <TextInputV2
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
                    <SelectV2
                      size="sm"
                      id="bug-severity"
                      aria-label="Bug severity"
                      value={bugSeverity}
                      onChange={(event) => setBugSeverity(event.target.value)}
                    >
                      {['low', 'medium', 'high', 'critical'].map((severity) => (
                        <option key={severity}>{severity}</option>
                      ))}
                    </SelectV2>
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
                  <ButtonV2 type="submit">Save changes</ButtonV2>
                  <ButtonV2
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void reload();
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </ButtonV2>
                </div>
              </form>
            </DialogV2>
          )}
          <div className={styles.layout}>
            <div className={styles.content}>
              {isBug ? (
                <>
                  <CardV2
                    variant="outlined"
                    as="section"
                    aria-label="How to reproduce"
                    className={styles.reproduction}
                  >
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
                  </CardV2>
                  <div className={styles.resultGrid}>
                    <CardV2
                      variant="outlined"
                      as="section"
                      aria-label="Actual result"
                      className={styles.actual}
                    >
                      <h2>Actual result</h2>
                      <p>{feature.actual_result || 'Not provided.'}</p>
                    </CardV2>
                    <CardV2
                      variant="outlined"
                      as="section"
                      aria-label="Expected result"
                      className={styles.expected}
                    >
                      <h2>Expected result</h2>
                      <p>{feature.expected_result || 'Not provided.'}</p>
                    </CardV2>
                  </div>
                </>
              ) : (
                <>
                  <CardV2
                    variant="outlined"
                    as="section"
                    aria-label="Description"
                    className={styles.descriptionCard}
                  >
                    <h2>Description</h2>
                    <p>{feature.description || 'No description yet.'}</p>
                    {feature.goal && (
                      <section>
                        <h3>Goal</h3>
                        <p>{feature.goal}</p>
                      </section>
                    )}
                  </CardV2>
                  {criteriaPanel}
                </>
              )}
              <CardV2
                variant="outlined"
                as="section"
                aria-label="Notes"
                className={styles.notesCard}
              >
                <h2>Notes</h2>
                <p>{feature.notes || 'No notes yet.'}</p>
              </CardV2>
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
                  <CardV2
                    variant="outlined"
                    as="section"
                    aria-label="Screenshots"
                    className={styles.screenshotsCard}
                  >
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
                          const contentUrl =
                            attachmentUrls[attachment.id] ??
                            `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments/${attachment.id}/content`;
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
                                <ButtonV2
                                  variant="ghost"
                                  onClick={() => void removeAttachment(attachment.id)}
                                >
                                  Remove {attachment.file_name}
                                </ButtonV2>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardV2>
                  <CardV2
                    variant="outlined"
                    as="section"
                    aria-label="Attach another screenshot"
                    className={styles.uploadCard}
                  >
                    <h2>Attach another screenshot</h2>
                    <p>PNG, JPG or WebP · up to 5 MB</p>
                    {!archived && (
                      <ButtonV2
                        variant="secondary"
                        className={styles.chooseImage}
                        aria-label="Add Bug screenshot"
                        disabled={attachments.length >= 5}
                        onClick={() => void chooseBugScreenshot()}
                      >
                        + Choose image
                      </ButtonV2>
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
                    {screenshotPickerError && (
                      <AlertV2 tone="error">{screenshotPickerError}</AlertV2>
                    )}
                  </CardV2>
                  <CardV2
                    variant="outlined"
                    as="section"
                    aria-label="Properties"
                    className={styles.bugProperties}
                  >
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
                  </CardV2>
                  <details className={styles.extraDetails}>
                    <summary>Tasks</summary>
                    {tasksPanel}
                  </details>
                </>
              ) : (
                <>
                  <CardV2
                    variant="outlined"
                    as="section"
                    aria-label="Properties"
                    className={styles.propertiesCard}
                  >
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
                  </CardV2>
                  {tasksPanel}
                  <CardV2
                    data-layout="flow"
                    variant="outlined"
                    as="section"
                    aria-label="Quick actions"
                    className={styles.quickActions}
                  >
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
                  </CardV2>
                </>
              )}
              {dependencies.length > 0 && (
                <CardV2
                  variant="outlined"
                  as="section"
                  aria-label="Dependencies"
                  className={styles.dependencies}
                >
                  <h2>Dependencies</h2>
                  <ul>
                    {dependencies.map((item) => (
                      <li key={item.id}>
                        {featureName(item.blocking_feature_id)} blocks{' '}
                        {featureName(item.blocked_feature_id)}
                      </li>
                    ))}
                  </ul>
                </CardV2>
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
