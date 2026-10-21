import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SearchField, SectionHeader, Select, StatusChip } from '@forge-org/ui';
import { organizationApi, type Dependency, type Feature, type PlanningOverview } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';

export function PlanningPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [overview, setOverview] = useState<PlanningOverview>({ epics: [], unassigned_features: [] });
  const [title, setTitle] = useState('');
  const [featureTitle, setFeatureTitle] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [epicFilter, setEpicFilter] = useState('all');
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [blockingFeatureId, setBlockingFeatureId] = useState('');
  const [blockedFeatureId, setBlockedFeatureId] = useState('');
  const [error, setError] = useState('');
  const features = overview.epics.flatMap((epic) => epic.features).concat(overview.unassigned_features);
  const visibleFeatures = features.filter((feature) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [feature.title, feature.description ?? '', feature.goal ?? ''].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (statusFilter === 'all' || feature.status === statusFilter) && (priorityFilter === 'all' || feature.priority === priorityFilter) && (epicFilter === 'all' || feature.epic_id === epicFilter || (epicFilter === 'unassigned' && feature.epic_id === null));
  });
  async function load() {
    try {
      const [nextOverview, nextDependencies] = await Promise.all([
        organizationApi.planningOverview(workspaceId, projectId),
        organizationApi.listDependencies(workspaceId, projectId),
      ]);
      setOverview(nextOverview);
      setDependencies(nextDependencies);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load planning.'); }
  }
  useEffect(() => { void load(); }, [workspaceId, projectId]);
  async function createEpic(event: React.FormEvent) { event.preventDefault(); if (!title.trim()) return; try { await organizationApi.createEpic(workspaceId, projectId, title); setTitle(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create epic.'); } }
  async function createFeature(event: React.FormEvent) { event.preventDefault(); if (!featureTitle.trim()) return; try { await organizationApi.createFeature(workspaceId, projectId, featureTitle); setFeatureTitle(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create feature.'); } }
  async function updateFeature(feature: Feature, values: Parameters<typeof organizationApi.updateFeature>[3]) {
    try { await organizationApi.updateFeature(workspaceId, projectId, feature.id, values); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update feature.'); }
  }
  async function addDependency(event: React.FormEvent) {
    event.preventDefault();
    if (!blockingFeatureId || !blockedFeatureId || blockingFeatureId === blockedFeatureId) return;
    try { await organizationApi.createDependency(workspaceId, projectId, blockingFeatureId, blockedFeatureId); setBlockingFeatureId(''); setBlockedFeatureId(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add dependency.'); }
  }
  async function removeDependency(dependency: Dependency) {
    try { await organizationApi.deleteDependency(workspaceId, projectId, dependency.id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove dependency.'); }
  }
  function featureName(id: string) { return features.find((feature) => feature.id === id)?.title ?? id; }
  return <div className={styles.stack}>
    <SectionHeader title="Planning" eyebrow="FORGE / Manual planning" />
    <p>Planning status, priority, search, filters, and dependencies are manual product records only; they never claim execution or delivery evidence.</p>
    {error && <p role="alert">{error}</p>}
    <div className={styles.forms}>
      <Card><form onSubmit={createEpic}><label htmlFor="epic-title">Epic title</label><Input id="epic-title" value={title} onChange={(event) => setTitle(event.target.value)} required /><Button type="submit">Create Epic</Button></form></Card>
      <Card><form onSubmit={createFeature}><label htmlFor="feature-title">Feature title</label><Input id="feature-title" value={featureTitle} onChange={(event) => setFeatureTitle(event.target.value)} required /><Button type="submit">Create Feature</Button></form></Card>
    </div>
    <Card><div className={styles.forms}>
      <FormField label="Search planning"><SearchField aria-label="Search planning" value={search} onChange={(event) => setSearch(event.target.value)} /></FormField>
      <FormField label="Status"><Select aria-label="Filter planning by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="backlog">Backlog</option><option value="in_progress">In progress</option><option value="verify">Verify</option><option value="done">Done</option></Select></FormField>
      <FormField label="Priority"><Select aria-label="Filter planning by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All priorities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></FormField>
      <FormField label="Epic"><Select aria-label="Filter planning by epic" value={epicFilter} onChange={(event) => setEpicFilter(event.target.value)}><option value="all">All epics</option><option value="unassigned">Unassigned</option>{overview.epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.title}</option>)}</Select></FormField>
    </div></Card>
    <div className={styles.board} aria-label="Planning board">{['backlog', 'in_progress', 'verify', 'done'].map((status) => <Card key={status}><h3>{status.replace('_', ' ')}</h3>{visibleFeatures.filter((feature) => feature.status === status).map((feature) => <article key={feature.id}><StatusChip tone="accent">{feature.priority}</StatusChip><p><Link to={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}>{feature.title}</Link></p><div><label>Priority<select aria-label={`Priority for ${feature.title}`} value={feature.priority} onChange={(event) => void updateFeature(feature, { priority: event.target.value as Feature['priority'] })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></label><label>Status<select aria-label={`Status for ${feature.title}`} value={feature.status} onChange={(event) => void updateFeature(feature, { status: event.target.value as Feature['status'] })}><option value="backlog">backlog</option><option value="in_progress">in progress</option><option value="verify">verify</option><option value="done">done</option></select></label><label>Epic<select aria-label={`Epic for ${feature.title}`} value={feature.epic_id ?? 'unassigned'} onChange={(event) => void updateFeature(feature, event.target.value === 'unassigned' ? { clear_epic: true } : { epic_id: event.target.value })}><option value="unassigned">unassigned</option>{overview.epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.title}</option>)}</select></label></div><Link to={`/readiness/${workspaceId}/${projectId}/${feature.id}`}>Readiness</Link></article>)}</Card>)}</div>
    <Card><form onSubmit={addDependency}><h3>Planning dependencies</h3><label>Blocking feature<select aria-label="Blocking feature" value={blockingFeatureId} onChange={(event) => setBlockingFeatureId(event.target.value)}><option value="">Select feature</option>{features.map((feature) => <option key={feature.id} value={feature.id}>{feature.title}</option>)}</select></label><label>Blocked feature<select aria-label="Blocked feature" value={blockedFeatureId} onChange={(event) => setBlockedFeatureId(event.target.value)}><option value="">Select feature</option>{features.map((feature) => <option key={feature.id} value={feature.id}>{feature.title}</option>)}</select></label><Button type="submit">Add dependency</Button></form>{dependencies.map((dependency) => <article key={dependency.id}><p>{featureName(dependency.blocking_feature_id)} blocks {featureName(dependency.blocked_feature_id)}</p><Button type="button" variant="secondary" onClick={() => void removeDependency(dependency)}>Remove dependency</Button></article>)}</Card>
  </div>;
}
