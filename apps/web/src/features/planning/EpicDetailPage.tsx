import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  organizationApi,
  type Epic,
  type EpicStatus,
  type Feature,
  type PlanningOverview,
  type Project,
} from '@forge-org/api-client';
import { Button, Card, Input, SectionHeader, Select, Textarea } from '@forge-org/ui';
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
  const [status, setStatus] = useState<EpicStatus>('backlog');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureSearch, setFeatureSearch] = useState('');
  const [featurePriority, setFeaturePriority] = useState('all');
  const [featureTag, setFeatureTag] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!epic || epic.id !== epicId || project?.status !== 'active' || !title.trim()) return;
    setSaved(false);
    setError('');
    try {
      const updated = await organizationApi.updateEpic(workspaceId, projectId, epic.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
      });
      if (currentEpicId.current !== epic.id) return;
      setEpic(updated);
      setTitle(updated.title);
      setDescription(updated.description ?? '');
      setStatus(updated.status);
      setSaved(true);
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
  return (
    <div className={styles.stack}>
      <SectionHeader title="Epic detail" eyebrow="FORGE / Manual planning" />
      <p>
        <Link to={`/planning/${workspaceId}/${projectId}`}>Back to planning board</Link>
        {' · '}
        <Link to={`/transfer/${workspaceId}/${projectId}/epics/${epicId}`}>
          Import / export Epic
        </Link>
        {' · '}
        <Link to={`/transfer/${workspaceId}/${projectId}/work-items/${epicId}`}>
          Import / export Stories and Bugs
        </Link>
      </p>
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
          <Card>
            {readOnly ? (
              <>
                <h2>{epic.title}</h2>
                <p>{epic.description}</p>
                <p>Status: {epic.status}</p>
              </>
            ) : (
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
                  onChange={(event) => setStatus(event.target.value as EpicStatus)}
                >
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
                <Button type="submit">Save Epic</Button>
              </form>
            )}
          </Card>
          <section aria-label="Epic Board">
            <h2>Epic Board · Work Items</h2>
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
            {features.length === 0 ? (
              <p>No Work Items linked to this Epic.</p>
            ) : (
              <>
                <div className={styles.board}>
                  {PLANNING_COLUMN_STATUSES.map(({ value: boardStatus }) => (
                    <KanbanColumn
                      key={boardStatus}
                      status={boardStatus}
                      emptyMessage="No Work Items in this status."
                    >
                      {filteredFeatures
                        .filter((feature) => feature.status === boardStatus)
                        .map((feature) => (
                          <FeatureCard
                            key={feature.id}
                            feature={feature}
                            href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
                          >
                            {!readOnly && (
                              <>
                                <label>
                                  Priority
                                  <select
                                    aria-label={`Priority for ${feature.title}`}
                                    value={feature.priority}
                                    onChange={(event) =>
                                      void moveFeature(feature, { priority: event.target.value })
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
                                      void moveFeature(feature, { status: event.target.value })
                                    }
                                  >
                                    {PLANNING_COLUMN_STATUSES.map((column) => (
                                      <option key={column.value} value={column.value}>
                                        {column.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </>
                            )}
                          </FeatureCard>
                        ))}
                    </KanbanColumn>
                  ))}
                </div>
                {filteredFeatures.some((feature) => feature.status === 'refining') && (
                  <section aria-label="Legacy refining Work Items">
                    <h3>Legacy status: Refining</h3>
                    {filteredFeatures
                      .filter((feature) => feature.status === 'refining')
                      .map((feature) => (
                        <FeatureCard
                          key={feature.id}
                          feature={feature}
                          href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
                        >
                          {!readOnly && (
                            <label>
                              Move to workflow status
                              <select
                                aria-label={`Status for ${feature.title}`}
                                value={feature.status}
                                onChange={(event) =>
                                  void moveFeature(feature, { status: event.target.value })
                                }
                              >
                                {PLANNING_COLUMN_STATUSES.map((column) => (
                                  <option key={column.value} value={column.value}>
                                    {column.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </FeatureCard>
                      ))}
                  </section>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
