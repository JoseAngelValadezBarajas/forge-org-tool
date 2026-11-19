import { Link } from 'react-router-dom';
import { type Feature } from '@forge-org/api-client';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  FeedbackStateV2,
  TabsV2,
} from '@corefoundry-labs/forge-ui';
import { KanbanColumn, PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
import styles from './EpicDetailPage.module.css';
import { useEpicDetailController } from './useEpicDetailController';
import { EpicEditDialog } from './epic-detail/EpicEditDialog';
import { EpicItemCard } from './epic-detail/EpicItemCard';
import { FeatureFilters } from './epic-detail/FeatureFilters';
import { WorkItemCreateDialog } from './epic-detail/WorkItemCreateDialog';

export function EpicDetailPage() {
  const model = useEpicDetailController();
  const {
    workspaceId,
    projectId,
    epicId,
    project,
    epic,
    features,
    error,
    saved,
    loading,
    setEditing,
    setCreateItemOpen,
    mobileStatus,
    setMobileStatus,
    isMobile,
    load,
    moveFeature,
    filteredFeatures,
    readOnly,
    completedCount,
    legacyFeatures,
  } = model;

  const itemCard = (feature: Feature) => (
    <EpicItemCard {...model} key={feature.id} feature={feature} />
  );
  const featureFilters = <FeatureFilters {...model} />;
  return (
    <div className={styles.stack}>
      <header className={styles.heading}>
        <div className={styles.titleGroup}>
          {!isMobile && <p className={styles.eyebrow}>Epic Board</p>}
          <h1>{epic?.title ?? 'Epic Board'}</h1>
          {isMobile ? (
            <p className={styles.mobileProgress}>
              {features.length} work items · {completedCount} completed
            </p>
          ) : (
            <p className={styles.epicDescription}>{epic?.description || 'No description yet.'}</p>
          )}
        </div>
        {epic && !readOnly && !isMobile && (
          <ButtonV2
            className={styles.primaryAction}
            aria-label="New Work Item"
            onClick={() => setCreateItemOpen(true)}
          >
            + New Item
          </ButtonV2>
        )}
        {epic && !readOnly && isMobile && (
          <ButtonV2
            variant="secondary"
            className={styles.mobileEditAction}
            aria-label="Edit Epic"
            onClick={() => setEditing(true)}
          >
            ✎
          </ButtonV2>
        )}
      </header>
      {!isMobile && (
        <details className={styles.epicActions}>
          <summary>Epic actions</summary>
          <nav aria-label="Epic actions" className={styles.pageLinks}>
            <Link to={`/planning/${workspaceId}/${projectId}`}>Back to Project Board</Link>
            {isMobile ? (
              <details className={styles.mobileEpicActions}>
                <summary>More Epic actions</summary>
                <Link to={`/transfer/${workspaceId}/${projectId}/epics/${epicId}`}>
                  Import / export Epic
                </Link>
                <Link to={`/transfer/${workspaceId}/${projectId}/work-items/${epicId}`}>
                  Import / export Stories and Bugs
                </Link>
              </details>
            ) : (
              <>
                <Link to={`/transfer/${workspaceId}/${projectId}/epics/${epicId}`}>
                  Import / export Epic
                </Link>
                <Link to={`/transfer/${workspaceId}/${projectId}/work-items/${epicId}`}>
                  Import / export Stories and Bugs
                </Link>
              </>
            )}
          </nav>
        </details>
      )}
      {loading && <FeedbackStateV2 state="loading" title="Loading Epic…" />}
      {error && (
        <AlertV2
          tone="error"
          actions={
            <ButtonV2 type="button" variant="secondary" onClick={() => void load()}>
              Retry
            </ButtonV2>
          }
        >
          {error}
        </AlertV2>
      )}
      {epic?.id === epicId && !loading && (
        <>
          {readOnly && (
            <AlertV2 tone="info">
              {project?.status !== 'active'
                ? 'This is an archived project. Epic details are read-only.'
                : 'This Epic is archived. Epic details are read-only.'}
            </AlertV2>
          )}
          {saved && <AlertV2 tone="success">Epic saved.</AlertV2>}
          <CardV2
            data-layout="flow"
            variant="outlined"
            as="section"
            aria-label="Epic context"
            className={styles.epicSummary}
          >
            <p className={styles.progress}>
              {features.length} work items <span>•</span> {completedCount} completed <span>•</span>{' '}
              {features.length ? Math.round((completedCount / features.length) * 100) : 0}% progress
            </p>
            <BadgeV2 className={styles.priority}>{epic.priority} priority</BadgeV2>
            <div className={styles.epicTags}>
              {epic.tags?.map((tag: string) => (
                <BadgeV2 key={tag}>{tag}</BadgeV2>
              ))}
            </div>
            <Link
              className={styles.export}
              to={`/transfer/${workspaceId}/${projectId}/work-items/${epicId}`}
              aria-label="Import / export Stories and Bugs"
            >
              Export ↗
            </Link>
            {!readOnly && (
              <ButtonV2
                variant="ghost"
                className={styles.editEpicAction}
                aria-label="Edit Epic"
                onClick={() => setEditing(true)}
              >
                ⋯
              </ButtonV2>
            )}
          </CardV2>
          <EpicEditDialog {...model} />
          <section aria-label="Epic Board" className={styles.boardSection}>
            {!isMobile && featureFilters}
            {features.length === 0 && <p>No Work Items linked to this Epic yet.</p>}
            {
              <>
                {isMobile ? (
                  <div className={styles.mobileBoard}>
                    <TabsV2
                      aria-label="Epic Work Item status"
                      defaultValue={mobileStatus}
                      onValueChange={setMobileStatus}
                      items={PLANNING_COLUMN_STATUSES.filter(({ value }) =>
                        ['ready', 'in_progress', 'verify'].includes(value),
                      ).map(({ value, label }) => {
                        const mobileLabel = value === 'in_progress' ? 'In Progress' : label;
                        return {
                          id: value,
                          label: `${mobileLabel} ${features.filter((feature) => feature.status === value).length}`,
                          content: (
                            <>
                              <h2 className={styles.mobileStatusHeading}>{mobileLabel}</h2>
                              <div className={styles.mobileItems}>
                                {filteredFeatures.filter((feature) => feature.status === value)
                                  .length === 0 ? (
                                  <p>No Work Items in {mobileLabel}.</p>
                                ) : (
                                  filteredFeatures
                                    .filter((feature) => feature.status === value)
                                    .map(itemCard)
                                )}
                              </div>
                            </>
                          ),
                        };
                      })}
                    />
                  </div>
                ) : (
                  <div
                    className={styles.board}
                    data-testid="epic-work-item-board"
                    data-scroll-axis="both"
                    role="region"
                    tabIndex={0}
                  >
                    {PLANNING_COLUMN_STATUSES.map(({ value: boardStatus }) => (
                      <KanbanColumn
                        key={boardStatus}
                        status={boardStatus}
                        emptyMessage="No Work Items in this status."
                        compact
                        headerCount={
                          filteredFeatures.filter((feature) => feature.status === boardStatus)
                            .length
                        }
                        onDrop={(event, destination) => {
                          event.preventDefault();
                          if (readOnly) return;
                          const id =
                            event.dataTransfer.getData('text/forge-feature-id') ||
                            event.dataTransfer.getData('text/plain');
                          const item = features.find((feature) => feature.id === id);
                          if (item && item.status !== destination)
                            void moveFeature(item, { status: destination });
                        }}
                      >
                        {filteredFeatures
                          .filter((feature) => feature.status === boardStatus)
                          .map(itemCard)}
                        {!readOnly && (
                          <ButtonV2
                            variant="ghost"
                            className={styles.addItem}
                            onClick={() => setCreateItemOpen(true)}
                          >
                            + Add item
                          </ButtonV2>
                        )}
                      </KanbanColumn>
                    ))}
                  </div>
                )}
                {isMobile && !readOnly && (
                  <ButtonV2
                    className={styles.mobileNewItem}
                    onClick={() => setCreateItemOpen(true)}
                  >
                    New Work Item
                  </ButtonV2>
                )}
                {isMobile &&
                  filteredFeatures.some(
                    (feature) => feature.status === 'backlog' || feature.status === 'done',
                  ) && (
                    <details className={styles.otherStatuses}>
                      <summary>Other workflow statuses</summary>
                      {filteredFeatures
                        .filter(
                          (feature) => feature.status === 'backlog' || feature.status === 'done',
                        )
                        .map(itemCard)}
                    </details>
                  )}
                {legacyFeatures.length > 0 && (
                  <section aria-label="Legacy Work Items" className={styles.legacyItems}>
                    <h3>Legacy Work Items requiring review</h3>
                    <p>
                      These stored statuses are outside the five-column workflow; move each item to
                      a supported status to return it to the Board.
                    </p>
                    {legacyFeatures.map(itemCard)}
                  </section>
                )}
              </>
            }
          </section>
          <WorkItemCreateDialog {...model} />
        </>
      )}
    </div>
  );
}
