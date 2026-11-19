import { AlertV2, ButtonV2, SelectV2 } from '@corefoundry-labs/forge-ui';
import { type EpicStatus } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';
import { CreateEpicDrawer } from './CreateEpicDrawer';
import { CreateEpicContextBoard } from './CreateEpicContextBoard';
import {
  EpicCard,
  FeatureCard,
  KanbanColumn,
  PLANNING_COLUMN_STATUSES,
  ProjectPlanningHome,
  StatusOptions,
} from './components';
import { usePlanningPage } from './usePlanningPage';
import { EpicToolbar } from './planning-board/EpicToolbar';
import { FeatureCreateDialog } from './planning-board/FeatureCreateDialog';
import { MobileEpicBoard } from './planning-board/MobileEpicBoard';
import { MobileWorkItemBoard } from './planning-board/MobileWorkItemBoard';

export function PlanningPage({ projectName = 'Project' }: { projectName?: string }) {
  const model = usePlanningPage();
  const {
    workspaceId,
    projectId,
    workspaceTags,
    tagCatalogError,
    epicDialogOpen,
    setEpicDialogOpen,
    featureDialogOpen,
    isMobile,
    rememberEpicCreateError,
    epicTriggerRef,
    createEpic,
    epicPriority,
    epicTags,
    error,
    overview,
    setEpicPriority,
    setEpicTags,
    epicDescription,
    setEpicDescription,
    setTitle,
    title,
    updateFeature,
    updateEpic,
    visibleFeatures,
    archivedEpics,
    workflowEpics,
    legacyEpics,
    filteredWorkflowEpics,
    epicPointerDrag,
  } = model;

  return (
    <ProjectPlanningHome>
      <div className={`${styles.stack} ${epicDialogOpen ? styles.createEpicMode : ''}`}>
        <section
          className={styles.pageHeading}
          data-testid="project-board-heading"
          data-node-id="344:111"
        >
          <div>
            <p
              className={styles.eyebrow}
              data-testid="project-board-eyebrow"
              data-node-id="344:113"
            >
              PROJECT BOARD
            </p>
            <h1 data-testid="project-board-title" data-node-id="344:114">
              {projectName} · Epics
            </h1>
            <p
              className={styles.headingDescription}
              data-testid="project-board-description"
              data-node-id="344:115"
            >
              {epicDialogOpen
                ? 'Create or edit work without leaving the Board.'
                : 'Track the big outcomes. Open an Epic to manage its work items.'}
            </p>
          </div>
          <ButtonV2
            type="button"
            aria-label="New Epic"
            data-node-id="343:12"
            className={styles.primaryEpicAction}
            hidden={epicDialogOpen}
            onClick={(event) => {
              epicTriggerRef.current = event.currentTarget;
              setEpicDialogOpen(true);
            }}
          >
            + New Epic
          </ButtonV2>
        </section>
        {error && <AlertV2 tone="error">{error}</AlertV2>}
        {featureDialogOpen && <FeatureCreateDialog {...model} />}
        <section className={styles.epicBoardSection} aria-label="Project Board">
          {!epicDialogOpen && <EpicToolbar {...model} />}
          <section className={styles.visuallyHidden} aria-label="Epic visibility summary">
            {overview.epics.length} total · {workflowEpics.length} in workflow ·{' '}
            {archivedEpics.length} archived · {legacyEpics.length} legacy
          </section>
          <div className={epicDialogOpen ? styles.boardAndDrawer : undefined}>
            {!isMobile && epicDialogOpen && (
              <CreateEpicContextBoard
                epics={workflowEpics}
                workspaceId={workspaceId}
                projectId={projectId}
              />
            )}
            {!isMobile && !epicDialogOpen && (
              <div
                className={`${styles.board} ${styles.epicBoard}`}
                aria-label="Epic workflow board"
                role="region"
                data-testid="project-epic-board"
                data-node-id="344:131"
                tabIndex={0}
              >
                {PLANNING_COLUMN_STATUSES.map(({ value: status }) => {
                  const columnEpics = filteredWorkflowEpics.filter(
                    (epic) => epic.status === status,
                  );
                  return (
                    <KanbanColumn
                      key={`epics-${status}`}
                      status={status}
                      compact
                      headerCount={columnEpics.length}
                      emptyMessage="No Epics in this status."
                      onDrop={(event, destination) => {
                        event.preventDefault();
                        const id =
                          event.dataTransfer.getData('text/forge-epic-id') ||
                          event.dataTransfer.getData('text/plain');
                        const epic = workflowEpics.find((item) => item.id === id);
                        if (epic && epic.status !== destination) {
                          void updateEpic(epic, destination);
                        }
                      }}
                    >
                      {columnEpics.map((epic) => (
                        <EpicCard
                          key={epic.id}
                          epic={epic}
                          compact
                          href={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                          draggable
                          pointerDrag
                          dragging={epicPointerDrag.draggingId === epic.id}
                          onPointerDown={(event) => epicPointerDrag.start(epic.id, event)}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/forge-epic-id', epic.id);
                            event.dataTransfer.setData('text/plain', epic.id);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                        />
                      ))}
                      {columnEpics.length > 0 && (
                        <button
                          className={styles.addEpic}
                          type="button"
                          onClick={(event) => {
                            epicTriggerRef.current = event.currentTarget;
                            setEpicDialogOpen(true);
                          }}
                        >
                          + Add Epic
                        </button>
                      )}
                    </KanbanColumn>
                  );
                })}
              </div>
            )}
            {epicDialogOpen && (
              <CreateEpicDrawer
                projectName={projectName}
                title={title}
                onTitleChange={setTitle}
                description={epicDescription}
                onDescriptionChange={setEpicDescription}
                priority={epicPriority}
                onPriorityChange={(value) => setEpicPriority(value as typeof epicPriority)}
                tags={epicTags}
                onTagsChange={setEpicTags}
                workspaceTags={workspaceTags}
                tagCatalogError={tagCatalogError}
                onSubmit={(event) => {
                  rememberEpicCreateError();
                  void createEpic(event);
                }}
                onCancel={() => setEpicDialogOpen(false)}
              />
            )}
          </div>
          {isMobile && <MobileEpicBoard {...model} />}
          {archivedEpics.length > 0 && (
            <section aria-label="Archived Epics">
              <h3>Archived Epics</h3>
              <div className={styles.legacyCards}>
                {archivedEpics.map((epic) => (
                  <EpicCard
                    key={epic.id}
                    epic={epic}
                    href={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                  />
                ))}
              </div>
            </section>
          )}
          {legacyEpics.length > 0 && (
            <section aria-label="Legacy Epics">
              <h3>Legacy Epics requiring review</h3>
              <p>
                These Epics have stored workflow states this version does not recognize. They are
                preserved; choose a supported state to return one to the workflow board.
              </p>
              <div className={styles.legacyCards}>
                {legacyEpics.map((epic) => (
                  <EpicCard
                    key={epic.id}
                    epic={epic}
                    href={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                  >
                    <label>
                      Recover Epic status
                      <SelectV2
                        size="sm"
                        aria-label={`Status for Epic ${epic.title}`}
                        value={epic.status}
                        onChange={(event) =>
                          void updateEpic(epic, event.target.value as EpicStatus)
                        }
                      >
                        <option value={epic.status}>Unsupported: {epic.status}</option>
                        <StatusOptions />
                      </SelectV2>
                    </label>
                  </EpicCard>
                ))}
              </div>
            </section>
          )}
        </section>
        {isMobile && <MobileWorkItemBoard {...model} />}
        {visibleFeatures.some((feature) => feature.status === 'refining') && (
          <section aria-label="Legacy refining work items">
            <h3>Legacy status: Refining</h3>
            <div className={styles.forms}>
              {visibleFeatures
                .filter((feature) => feature.status === 'refining')
                .map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
                  >
                    <label>
                      Move to workflow status
                      <SelectV2
                        size="sm"
                        aria-label={`Status for ${feature.title}`}
                        value={feature.status}
                        onChange={(event) =>
                          void updateFeature(feature, { status: event.target.value })
                        }
                      >
                        <StatusOptions />
                      </SelectV2>
                    </label>
                  </FeatureCard>
                ))}
            </div>
          </section>
        )}
      </div>
    </ProjectPlanningHome>
  );
}
