import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type PlanningOverview } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';

export function PlanningPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [overview, setOverview] = useState<PlanningOverview>({ epics: [], unassigned_features: [] });
  const [title, setTitle] = useState('');
  const [featureTitle, setFeatureTitle] = useState('');
  const [error, setError] = useState('');
  async function load() { try { setOverview(await organizationApi.planningOverview(workspaceId, projectId)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load planning.'); } }
  useEffect(() => { void load(); }, [workspaceId, projectId]);
  async function createEpic(event: React.FormEvent) { event.preventDefault(); if (!title.trim()) return; try { await organizationApi.createEpic(workspaceId, projectId, title); setTitle(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create epic.'); } }
  async function createFeature(event: React.FormEvent) { event.preventDefault(); if (!featureTitle.trim()) return; try { await organizationApi.createFeature(workspaceId, projectId, featureTitle); setFeatureTitle(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create feature.'); } }
  return <div className={styles.stack}><SectionHeader title="Planning" eyebrow="FORGE / Manual planning" />{error && <p role="alert">{error}</p>}<div className={styles.forms}><Card><form onSubmit={createEpic}><label htmlFor="epic-title">Epic title</label><Input id="epic-title" value={title} onChange={(event) => setTitle(event.target.value)} required /><Button type="submit">Create Epic</Button></form></Card><Card><form onSubmit={createFeature}><label htmlFor="feature-title">Feature title</label><Input id="feature-title" value={featureTitle} onChange={(event) => setFeatureTitle(event.target.value)} required /><Button type="submit">Create Feature</Button></form></Card></div><div className={styles.board} aria-label="Planning board">{['backlog', 'in_progress', 'verify', 'done'].map((status) => <Card key={status}><h3>{status.replace('_', ' ')}</h3>{overview.epics.flatMap((epic) => epic.features).concat(overview.unassigned_features).filter((feature) => feature.status === status).map((feature) => <article key={feature.id}><StatusChip tone="accent">{feature.priority}</StatusChip><p><Link to={`/readiness/${workspaceId}/${projectId}/${feature.id}`}>{feature.title}</Link></p></article>)}</Card>)}</div></div>;
}
