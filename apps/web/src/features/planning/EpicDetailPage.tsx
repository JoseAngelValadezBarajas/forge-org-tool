import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  organizationApi,
  type Epic,
  type EpicStatus,
  type Feature,
  type PlanningOverview,
  type Project,
  type WorkspaceTag,
} from '@forge-org/api-client';
import {
  Button,
  Card,
  Dialog,
  Input,
  MultiSelect,
  SectionHeader,
  Select,
  Tabs,
  Textarea,
} from '@forge-org/ui';
import { FeatureCard } from './components/FeatureCard/FeatureCard';
import { KanbanColumn, PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
import styles from './EpicDetailPage.module.css';

const statuses: EpicStatus[] = ['backlog', 'ready', 'in_progress', 'verify', 'done'];

export function EpicDetailPage() {
  const { workspaceId = '', projectId = '', epicId = '' } = useParams();
  const currentEpicId = useRef(epicId);
  const [project, setProject] = useState<Project | null>(null);
  const [epic, setEpic] = useState<Epic | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('backlog');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureSearch, setFeatureSearch] = useState('');
  const [featurePriority, setFeaturePriority] = useState('all');
  const [featureTag, setFeatureTag] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemKind, setNewItemKind] = useState<'story' | 'bug'>('story');
  const [newItemTags, setNewItemTags] = useState<string[]>([]);
  const [newBugSeverity, setNewBugSeverity] = useState('medium');
  const [newBugSteps, setNewBugSteps] = useState('');
  const [newBugExpected, setNewBugExpected] = useState('');
  const [newBugActual, setNewBugActual] = useState('');
  const [workspaceTags, setWorkspaceTags] = useState<WorkspaceTag[]>([]);
  const [mobileStatus, setMobileStatus] = useState('backlog');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 720);

  useEffect(() => {
    currentEpicId.current = epicId;
  }, [epicId]);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      setLoading(true);
      setError('');
      try {
        const [nextProject, overview]: [Project, PlanningOverview] = await Promise.all([
          organizationApi.getProject(workspaceId, projectId),
          organizationApi.planningOverview(workspaceId, projectId),
        ]);
        if (!isCurrent()) return;
        const match = overview.epics.find(
          (item) => item.id === epicId && item.project_id === projectId,
        );
        if (!match) throw new Error('Epic not found in this project.');
        setProject(nextProject);
        setEpic(match);
        setTitle(match.title);
        setDescription(match.description ?? '');
        setStatus(match.status);
        setFeatures(match.features);
      } catch (cause) {
        if (isCurrent())
          setError(cause instanceof Error ? cause.message : 'Unable to load Epic detail.');
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [epicId, projectId, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);

  useEffect(() => {
    let current = true;
    void organizationApi.listWorkspaceTags(workspaceId).then(
      (tags) => current && setWorkspaceTags(tags),
      () => current && setError('Workspace tags could not be loaded.'),
    );
    return () => {
      current = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    function updateViewport() {
      setIsMobile(window.innerWidth <= 720);
    }
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!epic || epic.id !== epicId || project?.status !== 'active' || !title.trim()) return;
    setSaved(false);
    setError('');
    try {
      const updated = await organizationApi.updateEpic(workspaceId, projectId, epic.id, {
        title: title.trim(),
        description: description.trim() || null,
        ...(statuses.includes(status as EpicStatus) ? { status: status as EpicStatus } : {}),
      });
      if (currentEpicId.current !== epic.id) return;
      setEpic(updated);
      setTitle(updated.title);
      setDescription(updated.description ?? '');
      setStatus(updated.status);
      setSaved(true);
      setEditing(false);
    } catch (cause) {
      if (currentEpicId.current !== epic.id) return;
      setError(cause instanceof Error ? cause.message : 'Unable to save Epic.');
    }
  }

  async function moveFeature(
    feature: Feature,
    values: { status?: Feature['status']; priority?: Feature['priority'] },
  ) {
    try {
      const updated = await organizationApi.updateFeature(
        workspaceId,
        projectId,
        feature.id,
        values,
      );
      setFeatures((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update Work Item.');
    }
  }

  async function createWorkItem(event: FormEvent) {
    event.preventDefault();
    if (!newItemTitle.trim() || readOnly) return;
    const details =
      newItemKind === 'bug'
        ? {
            kind: 'bug' as const,
            bug_severity: newBugSeverity,
            steps_to_reproduce: newBugSteps,
            expected_result: newBugExpected,
            actual_result: newBugActual,
            tags: newItemTags,
          }
        : { kind: 'story' as const, tags: newItemTags };
    try {
      const created = await organizationApi.createFeature(
        workspaceId,
        projectId,
        newItemTitle.trim(),
        epicId,
        details,
      );
      setFeatures((items) => [...items, created]);
      setNewItemTitle('');
      setNewItemTags([]);
      setNewBugSteps('');
      setNewBugExpected('');
      setNewBugActual('');
      setError('');
      setCreateItemOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create Work Item.');
    }
  }

  const filteredFeatures = features.filter((feature) => {
    const query = featureSearch.trim().toLocaleLowerCase();
    const tag = featureTag.trim().toLocaleLowerCase();
    return (
      (!query || feature.title.toLocaleLowerCase().includes(query)) &&
      (featurePriority === 'all' || feature.priority === featurePriority) &&
      (!tag || feature.tags?.some((value: string) => value.toLocaleLowerCase().includes(tag)))
    );
  });

  const readOnly = project?.status !== 'active' || Boolean(epic?.archived_at);
  const completedCount = features.filter((feature) => feature.status === 'done').length;
  const workflowFeatureCount = features.filter((feature) =>
    PLANNING_COLUMN_STATUSES.some((column) => column.value === feature.status),
  ).length;
  const legacyFeatures = filteredFeatures.filter(
    (feature) => !PLANNING_COLUMN_STATUSES.some((column) => column.value === feature.status),
  );
  const itemCard = (feature: Feature) => (
    <FeatureCard
      key={feature.id}
      feature={feature}
      href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
    >
      {!readOnly && (
        <div className={styles.itemActions}>
          <label>
            Priority
            <select
              aria-label={`Priority for ${feature.title}`}
              value={feature.priority}
              onChange={(event) =>
                void moveFeature(feature, { priority: event.target.value as Feature['priority'] })
              }
            >
              {['low', 'medium', 'high', 'critical'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Move to status
            <select
              aria-label={`Status for ${feature.title}`}
              value={feature.status}
              onChange={(event) =>
                void moveFeature(feature, { status: event.target.value as Feature['status'] })
              }
            >
              {PLANNING_COLUMN_STATUSES.map((column) => (
                <option key={column.value} value={column.value}>
                  {column.label}
                </option>
              ))}
              {!PLANNING_COLUMN_STATUSES.some((column) => column.value === feature.status) && (
                <option value={feature.status}>Unsupported: {feature.status}</option>
              )}
            </select>
          </label>
        </div>
      )}
    </FeatureCard>
  );
  const featureFilters = (
    <div className={styles.form}>
      <label htmlFor="epic-board-search">Find Work Items</label>
      <Input
        id="epic-board-search"
        aria-label="Find Work Items"
        value={featureSearch}
        onChange={(event) => setFeatureSearch(event.target.value)}
      />
      <label htmlFor="epic-board-priority">Filter by priority</label>
      <Select
        id="epic-board-priority"
        aria-label="Filter Work Items by priority"
        value={featurePriority}
        onChange={(event) => setFeaturePriority(event.target.value)}
      >
        <option value="all">All priorities</option>
        {['low', 'medium', 'high', 'critical'].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </Select>
      <label htmlFor="epic-board-tag">Filter by tag</label>
      <Input
        id="epic-board-tag"
        aria-label="Filter Work Items by tag"
        value={featureTag}
        onChange={(event) => setFeatureTag(event.target.value)}
      />
    </div>
  );
  return (
    <div className={styles.stack}>
      <SectionHeader
        title={epic?.title ?? 'Epic Board'}
        eyebrow={`${project?.name ?? 'Project'} / Epic`}
        actions={
          epic && !readOnly ? (
            <Button onClick={() => setEditing(true)}>Edit Epic</Button>
          ) : undefined
        }
      />
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
      {loading && <p role="status">Loading Epic…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}
      {epic?.id === epicId && !loading && (
        <>
          {readOnly && (
            <p role="status">
              {project?.status !== 'active'
                ? 'This is an archived project. Epic details are read-only.'
                : 'This Epic is archived. Epic details are read-only.'}
            </p>
          )}
          {saved && <p role="status">Epic saved.</p>}
          <Card className={styles.epicSummary}>
            <p className={styles.epicDescription}>{epic.description || 'No description yet.'}</p>
            <dl className={styles.epicMetadata}>
              <div>
                <dt>Status</dt>
                <dd>{epic.status}</dd>
              </div>
              <div>
                <dt>Work items</dt>
                <dd>{features.length}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{completedCount}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>
                  {features.length ? Math.round((completedCount / features.length) * 100) : 0}%
                </dd>
              </div>
            </dl>
          </Card>
          <Dialog
            title="Edit Epic"
            description="Update the Epic summary and workflow status."
            open={editing}
            onClose={() => setEditing(false)}
          >
            <form className={styles.form} onSubmit={save}>
              <label htmlFor="epic-title">Epic title</label>
              <Input
                id="epic-title"
                aria-label="Epic title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <label htmlFor="epic-description">Description</label>
              <Textarea
                id="epic-description"
                aria-label="Epic description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <label htmlFor="epic-status">Status</label>
              <Select
                id="epic-status"
                aria-label="Epic status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {!statuses.includes(status as EpicStatus) && (
                  <option value={status}>Unsupported: {status}</option>
                )}
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <div className={styles.formActions}>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Epic</Button>
              </div>
            </form>
          </Dialog>
          <section aria-label="Epic Board">
            <header className={styles.boardHeader}>
              <div>
                <h2>Stories and Bugs</h2>
                <p>
                  {features.length} total · {workflowFeatureCount} in workflow
                </p>
              </div>
              {!readOnly && <Button onClick={() => setCreateItemOpen(true)}>New Work Item</Button>}
            </header>
            {isMobile ? (
              <details className={styles.mobileFilters}>
                <summary>Filter Work Items</summary>
                {featureFilters}
              </details>
            ) : (
              featureFilters
            )}
            {features.length === 0 && <p>No Work Items linked to this Epic yet.</p>}
            {features.length > 0 && (
              <>
                {isMobile ? (
                  <div className={styles.mobileBoard}>
                    <Tabs
                      label="Epic Work Item status"
                      defaultValue={mobileStatus}
                      onChange={setMobileStatus}
                      tabs={PLANNING_COLUMN_STATUSES.map(({ value, label }) => ({
                        id: value,
                        label,
                        content: (
                          <div className={styles.mobileItems}>
                            {filteredFeatures.filter((feature) => feature.status === value)
                              .length === 0 ? (
                              <p>No Work Items in {label}.</p>
                            ) : (
                              filteredFeatures
                                .filter((feature) => feature.status === value)
                                .map(itemCard)
                            )}
                          </div>
                        ),
                      }))}
                    />
                  </div>
                ) : (
                  <div className={styles.board} data-testid="epic-work-item-board">
                    {PLANNING_COLUMN_STATUSES.map(({ value: boardStatus }) => (
                      <KanbanColumn
                        key={boardStatus}
                        status={boardStatus}
                        emptyMessage="No Work Items in this status."
                      >
                        {filteredFeatures
                          .filter((feature) => feature.status === boardStatus)
                          .map(itemCard)}
                      </KanbanColumn>
                    ))}
                  </div>
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
            )}
          </section>
          <Dialog
            title="Create Work Item"
            description={`Add a Story or Bug to ${epic.title}.`}
            open={createItemOpen}
            onClose={() => setCreateItemOpen(false)}
          >
            <form className={styles.form} onSubmit={(event) => void createWorkItem(event)}>
              <fieldset className={styles.kindChoice}>
                <legend>Work Item type</legend>
                {(['story', 'bug'] as const).map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    variant={newItemKind === kind ? 'primary' : 'secondary'}
                    aria-pressed={newItemKind === kind}
                    onClick={() => setNewItemKind(kind)}
                  >
                    {kind === 'story' ? 'Story' : 'Bug'}
                  </Button>
                ))}
              </fieldset>
              <label htmlFor="new-work-item-title">Title</label>
              <Input
                id="new-work-item-title"
                aria-label="Work Item title"
                value={newItemTitle}
                onChange={(event) => setNewItemTitle(event.target.value)}
                required
              />
              <MultiSelect
                label="Workspace tags"
                options={workspaceTags.map((tag) => ({ value: tag.name, label: tag.name }))}
                value={newItemTags}
                onValuesChange={setNewItemTags}
                presentation="checkboxList"
                emptyMessage="No workspace tags available. Manage tags in Workspace settings."
              />
              {newItemKind === 'bug' && (
                <>
                  <label htmlFor="new-bug-severity">Bug severity</label>
                  <Select
                    id="new-bug-severity"
                    value={newBugSeverity}
                    onChange={(event) => setNewBugSeverity(event.target.value)}
                  >
                    {['low', 'medium', 'high', 'critical'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                  <label htmlFor="new-bug-steps">Steps to reproduce</label>
                  <Textarea
                    id="new-bug-steps"
                    value={newBugSteps}
                    onChange={(event) => setNewBugSteps(event.target.value)}
                    rows={3}
                  />
                  <label htmlFor="new-bug-expected">Expected result</label>
                  <Textarea
                    id="new-bug-expected"
                    value={newBugExpected}
                    onChange={(event) => setNewBugExpected(event.target.value)}
                    rows={2}
                  />
                  <label htmlFor="new-bug-actual">Actual result</label>
                  <Textarea
                    id="new-bug-actual"
                    value={newBugActual}
                    onChange={(event) => setNewBugActual(event.target.value)}
                    rows={2}
                  />
                </>
              )}
              <div className={styles.formActions}>
                <Button type="button" variant="secondary" onClick={() => setCreateItemOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Work Item</Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </div>
  );
}
