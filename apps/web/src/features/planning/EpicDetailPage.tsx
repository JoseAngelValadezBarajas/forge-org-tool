import { useCallback, useEffect, useState, type FormEvent } from 'react';
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
import styles from './EpicDetailPage.module.css';

const statuses: EpicStatus[] = ['planning', 'archived', 'planned', 'in_progress', 'done'];

export function EpicDetailPage() {
  const { workspaceId = '', projectId = '', epicId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [epic, setEpic] = useState<Epic | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EpicStatus>('planning');
  const [featureLinks, setFeatureLinks] = useState<Array<{ id: string; title: string }>>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
        setFeatureLinks(
          match.features.map((feature: Feature) => ({ id: feature.id, title: feature.title })),
        );
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
    void load(() => current);
    return () => {
      current = false;
    };
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!epic || project?.status !== 'active' || !title.trim()) return;
    setSaved(false);
    setError('');
    try {
      const updated = await organizationApi.updateEpic(workspaceId, projectId, epic.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
      });
      setEpic(updated);
      setTitle(updated.title);
      setDescription(updated.description ?? '');
      setStatus(updated.status);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save Epic.');
    }
  }

  const readOnly = project?.status !== 'active';
  return (
    <div className={styles.stack}>
      <SectionHeader title="Epic detail" eyebrow="FORGE / Manual planning" />
      <p>
        <Link to={`/planning/${workspaceId}/${projectId}`}>Back to planning board</Link>
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
      {epic && !loading && (
        <>
          {readOnly && (
            <p role="status">This is an archived project. Epic details are read-only.</p>
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
          <Card>
            <h2>Features</h2>
            {featureLinks.length === 0 ? (
              <p>No Features linked to this Epic.</p>
            ) : (
              <ul>
                {featureLinks.map((feature) => (
                  <li key={feature.id}>
                    <Link to={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}>
                      {feature.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
