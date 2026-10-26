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
  Badge,
  Card,
  Dialog,
  Input,
  MultiSelect,
  Select,
  Tabs,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import { KanbanColumn, PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
import { usePointerKanbanDrag } from './usePointerKanbanDrag';
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
  const [featureKind, setFeatureKind] = useState('all');
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
  const [mobileStatus, setMobileStatus] = useState('ready');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 720);
  const [mobileCardDetails, setMobileCardDetails] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!isMobile || features.length === 0) return;
    let current = true;
    void Promise.all(
      features.map(async (feature) => {
        try {
          if (feature.kind === 'bug') {
            const attachments = await organizationApi.listBugAttachments(
              workspaceId,
              projectId,
              feature.id,
            );
            return [
              feature.id,
              attachments.length ? 'Screenshot attached' : 'No screenshot',
            ] as const;
          }
          const criteria = await organizationApi.listCriteria(workspaceId, projectId, feature.id);
          return [feature.id, `${criteria.length} acceptance criteria`] as const;
        } catch {
          return [feature.id, ''] as const;
        }
      }),
    ).then((entries) => {
      if (current) setMobileCardDetails(Object.fromEntries(entries));
    });
    return () => {
      current = false;
    };
  }, [features, isMobile, projectId, workspaceId]);

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
      (featureKind === 'all' || feature.kind === featureKind) &&
      (featurePriority === 'all' || feature.priority === featurePriority) &&
      (!tag || feature.tags?.some((value: string) => value.toLocaleLowerCase().includes(tag)))
    );
  });

  const readOnly = project?.status !== 'active' || Boolean(epic?.archived_at);
  const completedCount = features.filter((feature) => feature.status === 'done').length;
  const legacyFeatures = filteredFeatures.filter(
    (feature) => !PLANNING_COLUMN_STATUSES.some((column) => column.value === feature.status),
  );
  const featurePointerDrag = usePointerKanbanDrag<Feature['status']>({
    onDrop: (id, destination) => {
      if (readOnly || !PLANNING_COLUMN_STATUSES.some((column) => column.value === destination)) {
        return;
      }
      const feature = features.find((item) => item.id === id);
      if (feature && feature.status !== destination)
        void moveFeature(feature, { status: destination });
    },
  });
  const itemCard = (feature: Feature) => (
    <Card
      as="article"
      key={feature.id}
      aria-label={feature.title}
      className={styles.itemCard}
      data-dragging={featurePointerDrag.draggingId === feature.id ? 'true' : undefined}
      draggable={false}
      onPointerDown={!readOnly ? (event) => featurePointerDrag.start(feature.id, event) : undefined}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/forge-feature-id', feature.id);
        event.dataTransfer.setData('text/plain', feature.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <p className={styles.itemKind}>
        {feature.kind === 'bug' ? 'Bug' : 'Story'} · {feature.priority}
      </p>
      <Link
        className={styles.itemTitle}
        draggable={false}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/forge-feature-id', feature.id);
          event.dataTransfer.setData('text/plain', feature.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        to={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
      >
        {feature.title}
      </Link>
      <p className={styles.itemTags}>
        {isMobile
          ? [
              mobileCardDetails[feature.id],
              feature.kind === 'bug'
                ? `${feature.status.charAt(0).toUpperCase()}${feature.status.slice(1)}`
                : feature.tags?.join(', '),
            ]
              .filter(Boolean)
              .join(' · ')
          : feature.tags?.join(' · ') || 'No tags'}
      </p>
      {!readOnly && (
        <details className={styles.itemActions}>
          <summary>Move</summary>
          <div className={styles.itemControls}>
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
        </details>
      )}
    </Card>
  );
  const featureFilters = (
    <div className={styles.filters} aria-label="Work item filters">
      <Select
        aria-label="Filter Work Items by type"
        value={featureKind}
        onChange={(event) => setFeatureKind(event.target.value)}
      >
        <option value="all">All items</option>
        <option value="story">Stories</option>
        <option value="bug">Bugs</option>
      </Select>
      <Input
        id="epic-board-search"
        aria-label="Find Work Items"
        placeholder="Search Stories & Bugs"
        value={featureSearch}
        onChange={(event) => setFeatureSearch(event.target.value)}
      />
      <Select
        id="epic-board-priority"
        aria-label="Filter Work Items by priority"
        value={featurePriority}
        onChange={(event) => setFeaturePriority(event.target.value)}
      >
        <option value="all">Priority</option>
        {['low', 'medium', 'high', 'critical'].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </Select>
      <Input
        id="epic-board-tag"
        aria-label="Filter Work Items by tag"
        placeholder="Tags"
        value={featureTag}
        onChange={(event) => setFeatureTag(event.target.value)}
      />
    </div>
  );
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
          <Button
            className={styles.primaryAction}
            aria-label="New Work Item"
            onClick={() => setCreateItemOpen(true)}
          >
            + New Item
          </Button>
        )}
        {epic && !readOnly && isMobile && (
          <Button
            variant="secondary"
            className={styles.mobileEditAction}
            aria-label="Edit Epic"
            onClick={() => setEditing(true)}
          >
            ✎
          </Button>
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
          <Card as="section" aria-label="Epic context" className={styles.epicSummary}>
            <p className={styles.progress}>
              {features.length} work items <span>•</span> {completedCount} completed <span>•</span>{' '}
              {features.length ? Math.round((completedCount / features.length) * 100) : 0}% progress
            </p>
            <Badge className={styles.priority}>{epic.priority} priority</Badge>
            <div className={styles.epicTags}>
              {epic.tags?.map((tag: string) => (
                <Badge key={tag}>{tag}</Badge>
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
              <Button
                variant="ghost"
                className={styles.editEpicAction}
                aria-label="Edit Epic"
                onClick={() => setEditing(true)}
              >
                ⋯
              </Button>
            )}
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
          <section aria-label="Epic Board" className={styles.boardSection}>
            {!isMobile && featureFilters}
            {features.length === 0 && <p>No Work Items linked to this Epic yet.</p>}
            {
              <>
                {isMobile ? (
                  <div className={styles.mobileBoard}>
                    <Tabs
                      label="Epic Work Item status"
                      defaultValue={mobileStatus}
                      onChange={setMobileStatus}
                      tabs={PLANNING_COLUMN_STATUSES.filter(({ value }) =>
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
                          <Button
                            variant="ghost"
                            className={styles.addItem}
                            onClick={() => setCreateItemOpen(true)}
                          >
                            + Add item
                          </Button>
                        )}
                      </KanbanColumn>
                    ))}
                  </div>
                )}
                {isMobile && !readOnly && (
                  <Button className={styles.mobileNewItem} onClick={() => setCreateItemOpen(true)}>
                    New Work Item
                  </Button>
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
