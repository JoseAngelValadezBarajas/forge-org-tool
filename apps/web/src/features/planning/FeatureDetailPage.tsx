import { Link } from 'react-router-dom';
import { AlertV2, BadgeV2, ButtonV2, CardV2, SelectV2 } from '@corefoundry-labs/forge-ui';
import { type Feature } from '@forge-org/api-client';
import { PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
import styles from './FeatureDetailPage.module.css';
import { StatusOptions } from './components';
import { BugEvidence } from './detail/BugEvidence';
import { BugReproduction } from './detail/BugReproduction';
import { CriteriaPanel } from './detail/CriteriaPanel';
import { FeatureEditDialog } from './detail/FeatureEditDialog';
import { titleCase } from './detail/model';
import { StoryProperties, StoryQuickActions } from './detail/StoryProperties';
import { TasksPanel } from './detail/TasksPanel';
import { useFeatureDetailPage } from './useFeatureDetailPage';

export function FeatureDetailPage() {
  const model = useFeatureDetailPage();
  const {
    editing,
    setEditing,
    workspaceId,
    projectId,
    dependencies,
    error,
    feature,
    archived,
    isBug,
    selectedTags,
    moving,
    moveError,
    epicName,
    moveStatus,
    featureName,
  } = model;

  const criteriaPanel = <CriteriaPanel {...model} />;
  const tasksPanel = <TasksPanel {...model} />;
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
            <StatusOptions />
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
          {editing && <FeatureEditDialog {...model} feature={feature} />}
          <div className={styles.layout}>
            <div className={styles.content}>
              {isBug ? (
                <>
                  <BugReproduction feature={feature} />
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
                  <BugEvidence {...model} feature={feature} />
                  <details className={styles.extraDetails}>
                    <summary>Tasks</summary>
                    {tasksPanel}
                  </details>
                </>
              ) : (
                <>
                  <StoryProperties {...model} feature={feature} />
                  {tasksPanel}
                  <StoryQuickActions {...model} feature={feature} />
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
