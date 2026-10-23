import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Dialog,
  FormField,
  Input,
  SearchField,
  SectionHeader,
  Select,
  Textarea,
} from '@forge-org/ui';
import {
  organizationApi,
  type EpicStatus,
  type Feature,
  type WorkspaceTag,
} from '@forge-org/api-client';
import styles from './PlanningPage.module.css';
import { usePlanningController } from './usePlanningController';
import {
  DependencyGroup,
  EpicCard,
  FeatureCard,
  FilterBar,
  KanbanColumn,
  PLANNING_COLUMN_STATUSES,
  ProjectPlanningHome,
} from './components';

export function PlanningPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [workspaceTags, setWorkspaceTags] = useState<WorkspaceTag[]>([]);
  const [tagCatalogError, setTagCatalogError] = useState('');
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [mobileEpicStatus, setMobileEpicStatus] = useState('all');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 720);
  const epicCreateErrorAtSubmit = useRef<string | null>(null);
  const featureCreateErrorAtSubmit = useRef<string | null>(null);
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
    addDependency,
    blockedFeatureId,
    blockingFeatureId,
    createEpic,
    createFeature,
    actualResult,
    bugSeverity,
    dependencies,
    epicFilter,
    epicPriority,
    epicTags,
    error,
    featureEpicId,
    featureKind,
    featureTags,
    featureName,
    featureTitle,
    features,
    overview,
    priorityFilter,
    removeDependency,
    search,
    setTagFilter,
    tagFilter,
    setBlockedFeatureId,
    setBlockingFeatureId,
    setEpicFilter,
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
    setPriorityFilter,
    setSearch,
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
  const archivedEpics = overview.epics.filter((epic) => Boolean(epic.archived_at));
  const workflowEpics = overview.epics.filter(
    (epic) =>
      !epic.archived_at && PLANNING_COLUMN_STATUSES.some((column) => column.value === epic.status),
  );
  const legacyEpics = overview.epics.filter(
    (epic) =>
      !epic.archived_at && !PLANNING_COLUMN_STATUSES.some((column) => column.value === epic.status),
  );
  return (
    <ProjectPlanningHome>
      <div className={styles.stack}>
        <SectionHeader title="Project Board" eyebrow="FORGE / Manual planning" />
        {error && <p role="alert">{error}</p>}
        <div className={styles.creationActions}>
          <Link className={styles.projectOverviewLink} to={`/projects/${workspaceId}/${projectId}`}>
            Project overview
          </Link>
          <Button type="button" onClick={() => setEpicDialogOpen(true)}>
            New Epic
          </Button>
          <Button type="button" variant="secondary" onClick={() => setFeatureDialogOpen(true)}>
            New work item
          </Button>
        </div>
        {epicDialogOpen && (
          <Dialog
            open
            title="Create Epic"
            description="Add an Epic to this project."
            className={styles.createEpicDrawer}
            onCancel={() => setEpicDialogOpen(false)}
          >
            <form
              className={styles.dialogForm}
              onSubmit={(event) => {
                epicCreateErrorAtSubmit.current = error;
                void createEpic(event);
              }}
            >
              <label htmlFor="epic-title">Epic title</label>
              <Input
                id="epic-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <FormField label="Epic priority">
                <Select
                  aria-label="Epic priority"
                  value={epicPriority}
                  onChange={(event) => setEpicPriority(event.target.value as typeof epicPriority)}
                >
                  {['low', 'medium', 'high', 'critical'].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </Select>
              </FormField>
              <fieldset className={styles.tagChoices}>
                <legend>Epic tags</legend>
                {tagCatalogError && <p role="status">{tagCatalogError}</p>}
                {workspaceTags.map((tag) => (
                  <label key={tag.id} className={styles.tagChoice}>
                    <input
                      type="checkbox"
                      aria-label={`Epic tag ${tag.name}`}
                      checked={epicTags
                        .split(',')
                        .map((value) => value.trim())
                        .includes(tag.name)}
                      onChange={(event) => {
                        const selected = epicTags
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean);
                        setEpicTags(
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
                {workspaceTags.length === 0 && !tagCatalogError && <p>No workspace tags yet.</p>}
              </fieldset>
              <Button type="submit">Create Epic</Button>
            </form>
          </Dialog>
        )}
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
        <section aria-label="Project Board">
          <h2>Project Board · Epics</h2>
          <section aria-label="Epic visibility summary">
            <p>
              {overview.epics.length} total · {workflowEpics.length} in workflow ·{' '}
              {archivedEpics.length} archived · {legacyEpics.length} legacy
            </p>
          </section>
          <p className={styles.disclaimer}>
            Planning status, priority, filters, and dependencies are manual product records only;
            they never claim execution or delivery evidence.
          </p>
          {!isMobile && (
            <div className={`${styles.board} ${styles.epicBoard}`} aria-label="Epic workflow board">
              {PLANNING_COLUMN_STATUSES.map(({ value: status }) => (
                <KanbanColumn
                  key={`epics-${status}`}
                  status={status}
                  emptyMessage="No Epics in this status."
                >
                  {overview.epics
                    .filter((epic) => epic.status === status && !epic.archived_at)
                    .map((epic) => (
                      <EpicCard
                        key={epic.id}
                        epic={epic}
                        href={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                      >
                        <label>
                          Epic status
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
                </KanbanColumn>
              ))}
            </div>
          )}
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
        <FilterBar resultCount={visibleFeatures.length}>
          <div className={styles.forms}>
            <FormField label="Search planning">
              <SearchField
                aria-label="Search planning"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <FormField label="Status">
              <Select
                aria-label="Filter planning by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="refining">Legacy refining</option>
                {PLANNING_COLUMN_STATUSES.map((column) => (
                  <option key={column.value} value={column.value}>
                    {column.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select
                aria-label="Filter planning by priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </FormField>
            <FormField label="Epic">
              <Select
                aria-label="Filter planning by epic"
                value={epicFilter}
                onChange={(event) => setEpicFilter(event.target.value)}
              >
                <option value="all">All epics</option>
                <option value="unassigned">Unassigned</option>
                {overview.epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Tag">
              <Select
                aria-label="Filter planning by tag"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
              >
                <option value="">All tags</option>
                {workspaceTags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </FilterBar>
        {!isMobile && (
          <div
            className={styles.board}
            aria-label="Planning board"
            data-testid="project-epic-board"
          >
            {PLANNING_COLUMN_STATUSES.map(({ value: status }) => {
              const columnFeatures = visibleFeatures.filter((feature) => feature.status === status);
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  onDrop={(event, destination) => {
                    event.preventDefault();
                    const featureId =
                      event.dataTransfer.getData('text/forge-feature-id') ||
                      event.dataTransfer.getData('text/plain');
                    const feature = visibleFeatures.find((item) => item.id === featureId);
                    if (feature && feature.status !== destination)
                      void updateFeature(feature, { status: destination });
                  }}
                >
                  {columnFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      draggable
                      data-testid={`work-item-card-${feature.id}`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/forge-feature-id', feature.id);
                        event.dataTransfer.setData('text/plain', feature.id);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <FeatureCard
                        feature={feature}
                        href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
                      >
                        <div>
                          <label>
                            Priority
                            <select
                              aria-label={`Priority for ${feature.title}`}
                              value={feature.priority}
                              onChange={(event) =>
                                void updateFeature(feature, {
                                  priority: event.target.value as Feature['priority'],
                                })
                              }
                            >
                              <option value="low">low</option>
                              <option value="medium">medium</option>
                              <option value="high">high</option>
                              <option value="critical">critical</option>
                            </select>
                          </label>
                          <label>
                            Status
                            <select
                              aria-label={`Status for ${feature.title}`}
                              value={feature.status}
                              onChange={(event) =>
                                void updateFeature(feature, {
                                  status: event.target.value as Feature['status'],
                                })
                              }
                            >
                              {PLANNING_COLUMN_STATUSES.map((column) => (
                                <option key={column.value} value={column.value}>
                                  {column.label.toLowerCase()}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Epic
                            <select
                              aria-label={`Epic for ${feature.title}`}
                              value={feature.epic_id ?? 'unassigned'}
                              onChange={(event) =>
                                void updateFeature(
                                  feature,
                                  event.target.value === 'unassigned'
                                    ? { clear_epic: true }
                                    : { epic_id: event.target.value },
                                )
                              }
                            >
                              <option value="unassigned">unassigned</option>
                              {overview.epics.map((epic) => (
                                <option key={epic.id} value={epic.id}>
                                  {epic.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </FeatureCard>
                    </div>
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        )}
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
        <Card>
          <form onSubmit={addDependency}>
            <h3>Planning dependencies</h3>
            <label>
              Blocking feature
              <select
                aria-label="Blocking feature"
                value={blockingFeatureId}
                onChange={(event) => setBlockingFeatureId(event.target.value)}
              >
                <option value="">Select feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Blocked feature
              <select
                aria-label="Blocked feature"
                value={blockedFeatureId}
                onChange={(event) => setBlockedFeatureId(event.target.value)}
              >
                <option value="">Select feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Add dependency</Button>
          </form>
          {dependencies.map((dependency) => (
            <DependencyGroup
              key={dependency.id}
              blocker={featureName(dependency.blocking_feature_id)}
              blocked={featureName(dependency.blocked_feature_id)}
              state={
                features.find((feature) => feature.id === dependency.blocking_feature_id)
                  ?.status === 'done'
                  ? 'Clear'
                  : 'Blocked'
              }
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => void removeDependency(dependency)}
              >
                Remove dependency
              </Button>
            </DependencyGroup>
          ))}
        </Card>
      </div>
    </ProjectPlanningHome>
  );
}
