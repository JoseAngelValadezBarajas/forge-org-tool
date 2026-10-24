import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Dialog, FormField, Input, Select, Textarea } from '@corefoundry-labs/forge-ui';
import { organizationApi, type EpicStatus, type WorkspaceTag } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';
import { CreateEpicDrawer } from './CreateEpicDrawer';
import { CreateEpicContextBoard } from './CreateEpicContextBoard';
import { usePlanningController } from './usePlanningController';
import {
  EpicCard,
  FeatureCard,
  KanbanColumn,
  PLANNING_COLUMN_STATUSES,
  ProjectPlanningHome,
} from './components';

export function PlanningPage({ projectName = 'Project' }: { projectName?: string }) {
  const { workspaceId = '', projectId = '' } = useParams();
  const [workspaceTags, setWorkspaceTags] = useState<WorkspaceTag[]>([]);
  const [tagCatalogError, setTagCatalogError] = useState('');
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [mobileEpicStatus, setMobileEpicStatus] = useState('all');
  const [epicSearch, setEpicSearch] = useState('');
  const [epicStatusFilter, setEpicStatusFilter] = useState('all');
  const [epicPriorityFilter, setEpicPriorityFilter] = useState('all');
  const [epicTagFilter, setEpicTagFilter] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 720);
  const epicCreateErrorAtSubmit = useRef<string | null>(null);
  const featureCreateErrorAtSubmit = useRef<string | null>(null);
  const epicTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth <= 720);
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);
  useEffect(() => {
    let current = true;
    void organizationApi.listWorkspaceTags(workspaceId).then(
      (tags) => current && Array.isArray(tags) && setWorkspaceTags(tags),
      () => current && setTagCatalogError('Workspace tags could not be loaded.'),
    );
    return () => {
      current = false;
    };
  }, [workspaceId]);
  const {
    createEpic,
    createFeature,
    actualResult,
    bugSeverity,
    epicPriority,
    epicTags,
    error,
    featureEpicId,
    featureKind,
    featureTags,
    featureTitle,
    overview,
    setFeatureTitle,
    setFeatureEpicId,
    setFeatureKind,
    setFeatureTags,
    setBugSeverity,
    setStepsToReproduce,
    setExpectedResult,
    setActualResult,
    setEpicPriority,
    setEpicTags,
    stepsToReproduce,
    expectedResult,
    epicDescription,
    setEpicDescription,
    setStatusFilter,
    setTitle,
    statusFilter,
    title,
    updateFeature,
    updateEpic,
    visibleFeatures,
  } = usePlanningController(workspaceId, projectId);
  useEffect(() => {
    if (epicCreateErrorAtSubmit.current === null) return;
    if (error && error !== epicCreateErrorAtSubmit.current) {
      epicCreateErrorAtSubmit.current = null;
      return;
    }
    if (!title) {
      const timeout = window.setTimeout(() => {
        epicCreateErrorAtSubmit.current = null;
        setEpicDialogOpen(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [error, title]);
  useEffect(() => {
    if (featureCreateErrorAtSubmit.current === null) return;
    if (error && error !== featureCreateErrorAtSubmit.current) {
      featureCreateErrorAtSubmit.current = null;
      return;
    }
    if (!featureTitle) {
      const timeout = window.setTimeout(() => {
        featureCreateErrorAtSubmit.current = null;
        setFeatureDialogOpen(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [error, featureTitle]);
  useEffect(() => {
    if (!epicDialogOpen) epicTriggerRef.current?.focus();
  }, [epicDialogOpen]);
  const archivedEpics = overview.epics.filter((epic) => Boolean(epic.archived_at));
  const workflowEpics = overview.epics.filter(
    (epic) =>
      !epic.archived_at && PLANNING_COLUMN_STATUSES.some((column) => column.value === epic.status),
  );
  const legacyEpics = overview.epics.filter(
    (epic) =>
      !epic.archived_at && !PLANNING_COLUMN_STATUSES.some((column) => column.value === epic.status),
  );
  const filteredWorkflowEpics = workflowEpics.filter((epic) => {
    const query = epicSearch.trim().toLowerCase();
    return (
      (!query || epic.title.toLowerCase().includes(query)) &&
      (epicStatusFilter === 'all' || epic.status === epicStatusFilter) &&
      (epicPriorityFilter === 'all' || epic.priority === epicPriorityFilter) &&
      (!epicTagFilter || epic.tags?.includes(epicTagFilter))
    );
  });
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
          <Button
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
          </Button>
        </section>
        {error && <p role="alert">{error}</p>}
        {featureDialogOpen && (
          <Dialog open title="Create work item" onCancel={() => setFeatureDialogOpen(false)}>
            <form
              className={styles.dialogForm}
              onSubmit={(event) => {
                featureCreateErrorAtSubmit.current = error;
                void createFeature(event);
              }}
            >
              <label htmlFor="feature-title">Feature title</label>
              <Input
                id="feature-title"
                value={featureTitle}
                onChange={(event) => setFeatureTitle(event.target.value)}
                required
              />
              <FormField label="Epic for new feature">
                <Select
                  aria-label="Epic for new feature"
                  value={featureEpicId}
                  onChange={(event) => setFeatureEpicId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {overview.epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.title}
                    </option>
                  ))}
                </Select>
              </FormField>
              <fieldset className={styles.workItemType}>
                <legend>Work item type</legend>
                <div className={styles.workItemTypeButtons}>
                  {(['story', 'bug'] as const).map((kind) => (
                    <Button
                      key={kind}
                      type="button"
                      variant={featureKind === kind ? 'primary' : 'secondary'}
                      aria-pressed={featureKind === kind}
                      onClick={() => setFeatureKind(kind)}
                    >
                      {kind === 'story' ? 'Story' : 'Bug'}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.tagChoices}>
                <legend>Work item tags</legend>
                {workspaceTags.map((tag) => (
                  <label key={tag.id} className={styles.tagChoice}>
                    <input
                      type="checkbox"
                      aria-label={`Work item tag ${tag.name}`}
                      checked={featureTags
                        .split(',')
                        .map((value) => value.trim())
                        .includes(tag.name)}
                      onChange={(event) => {
                        const selected = featureTags
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean);
                        setFeatureTags(
                          (event.target.checked
                            ? [...selected, tag.name]
                            : selected.filter((value) => value !== tag.name)
                          ).join(', '),
                        );
                      }}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
                {workspaceTags.length === 0 && <p>No workspace tags yet.</p>}
              </fieldset>
              {featureKind === 'bug' && (
                <div aria-label="Bug details">
                  <FormField label="Bug severity">
                    <Select
                      aria-label="Bug severity"
                      value={bugSeverity}
                      onChange={(event) => setBugSeverity(event.target.value as typeof bugSeverity)}
                    >
                      {['low', 'medium', 'high', 'critical'].map((severity) => (
                        <option key={severity} value={severity}>
                          {severity}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Steps to reproduce">
                    <Textarea
                      aria-label="Steps to reproduce"
                      value={stepsToReproduce}
                      onChange={(event) => setStepsToReproduce(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Expected result">
                    <Textarea
                      aria-label="Expected result"
                      value={expectedResult}
                      onChange={(event) => setExpectedResult(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Actual result">
                    <Textarea
                      aria-label="Actual result"
                      value={actualResult}
                      onChange={(event) => setActualResult(event.target.value)}
                    />
                  </FormField>
                </div>
              )}
              <Button type="submit">Create Feature</Button>
            </form>
          </Dialog>
        )}
        <section className={styles.epicBoardSection} aria-label="Project Board">
          {!epicDialogOpen && (
            <div
              className={styles.epicToolbar}
              aria-label="Epic board filters"
              data-node-id="344:118"
            >
              <details className={styles.boardViewMenu}>
                <summary>Board&nbsp; ▾</summary>
                <div>
                  <span aria-current="page">Epics</span>
                  <Link to={`/projects/${workspaceId}/${projectId}`}>Project overview</Link>
                  <Button type="button" variant="ghost" onClick={() => setFeatureDialogOpen(true)}>
                    New work item
                  </Button>
                  <p>Planning status and dependencies are manual product records only.</p>
                </div>
              </details>
              <Input
                className={`${styles.epicFilter} ${styles.epicSearch}`}
                type="search"
                aria-label="Search Epics"
                placeholder="Search Epics    ⌕"
                value={epicSearch}
                onChange={(event) => setEpicSearch(event.target.value)}
              />
              <Select
                className={`${styles.epicFilter} ${styles.epicStatusFilter}`}
                aria-label="Filter Epics by status"
                value={epicStatusFilter}
                onChange={(event) => setEpicStatusFilter(event.target.value)}
              >
                <option value="all">Status: All</option>
                {PLANNING_COLUMN_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>{`Status: ${label}`}</option>
                ))}
              </Select>
              <Select
                className={`${styles.epicFilter} ${styles.epicPriorityFilter}`}
                aria-label="Filter Epics by priority"
                value={epicPriorityFilter}
                onChange={(event) => setEpicPriorityFilter(event.target.value)}
              >
                <option value="all">Priority&nbsp; ▾</option>
                {['low', 'medium', 'high', 'critical'].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority[0]?.toUpperCase()}
                    {priority.slice(1)}
                  </option>
                ))}
              </Select>
              <Select
                className={`${styles.epicFilter} ${styles.epicTagFilter}`}
                aria-label="Filter Epics by tag"
                value={epicTagFilter}
                onChange={(event) => setEpicTagFilter(event.target.value)}
              >
                <option value="">Tags&nbsp; ▾</option>
                {workspaceTags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </Select>
              <Link
                className={`${styles.epicFilter} ${styles.importEpic}`}
                to={`/transfer/${workspaceId}/${projectId}/epics/${projectId}`}
              >
                ⇩ Import Epic
              </Link>
            </div>
          )}
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
                data-testid="project-epic-board"
                data-node-id="344:131"
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
                        const id = event.dataTransfer.getData('text/forge-epic-id');
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
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/forge-epic-id', epic.id);
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
                  epicCreateErrorAtSubmit.current = error;
                  void createEpic(event);
                }}
                onCancel={() => setEpicDialogOpen(false)}
              />
            )}
          </div>
          {isMobile && (
            <section aria-label="Mobile Epic board" className={styles.mobileBoard}>
              <FormField label="Epic status">
                <Select
                  aria-label="Mobile Epic status"
                  value={mobileEpicStatus}
                  onChange={(event) => setMobileEpicStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {PLANNING_COLUMN_STATUSES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className={styles.mobileCards}>
                {workflowEpics
                  .filter((epic) => mobileEpicStatus === 'all' || epic.status === mobileEpicStatus)
                  .map((epic) => (
                    <EpicCard
                      key={epic.id}
                      epic={epic}
                      href={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                    >
                      <label>
                        Move Epic
                        <Select
                          aria-label={`Status for Epic ${epic.title}`}
                          value={epic.status}
                          onChange={(event) =>
                            void updateEpic(epic, event.target.value as EpicStatus)
                          }
                        >
                          {PLANNING_COLUMN_STATUSES.map((column) => (
                            <option key={column.value} value={column.value}>
                              {column.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </EpicCard>
                  ))}
                {workflowEpics.filter(
                  (epic) => mobileEpicStatus === 'all' || epic.status === mobileEpicStatus,
                ).length === 0 && <p>No Epics in this status.</p>}
              </div>
            </section>
          )}
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
                      <Select
                        aria-label={`Status for Epic ${epic.title}`}
                        value={epic.status}
                        onChange={(event) =>
                          void updateEpic(epic, event.target.value as EpicStatus)
                        }
                      >
                        <option value={epic.status}>Unsupported: {epic.status}</option>
                        {PLANNING_COLUMN_STATUSES.map((column) => (
                          <option key={column.value} value={column.value}>
                            {column.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </EpicCard>
                ))}
              </div>
            </section>
          )}
        </section>
        {isMobile && (
          <section aria-label="Mobile work item board" className={styles.mobileBoard}>
            <FormField label="Work item status">
              <Select
                aria-label="Mobile work item status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="refining">Legacy refining</option>
                {PLANNING_COLUMN_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className={styles.mobileCards}>
              {visibleFeatures.map((feature) => (
                <FeatureCard
                  key={`mobile-${feature.id}`}
                  feature={feature}
                  href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
                >
                  <label>
                    Move work item
                    <Select
                      aria-label={`Mobile status for ${feature.title}`}
                      value={feature.status}
                      onChange={(event) =>
                        void updateFeature(feature, { status: event.target.value })
                      }
                    >
                      {feature.status === 'refining' && (
                        <option value="refining">Legacy refining</option>
                      )}
                      {PLANNING_COLUMN_STATUSES.map((column) => (
                        <option key={column.value} value={column.value}>
                          {column.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </FeatureCard>
              ))}
              {visibleFeatures.length === 0 && <p>No work items match these filters.</p>}
            </div>
          </section>
        )}
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
                      <Select
                        aria-label={`Status for ${feature.title}`}
                        value={feature.status}
                        onChange={(event) =>
                          void updateFeature(feature, { status: event.target.value })
                        }
                      >
                        {PLANNING_COLUMN_STATUSES.map((column) => (
                          <option key={column.value} value={column.value}>
                            {column.label}
                          </option>
                        ))}
                      </Select>
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
