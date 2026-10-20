import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type Handoff, type Run } from '@forge-org/api-client';
import styles from './WorkbenchPage.module.css';

export function WorkbenchPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [runs, setRuns] = useState<Run[]>([]); const [handoffs, setHandoffs] = useState<Handoff[]>([]); const [title, setTitle] = useState(''); const [error, setError] = useState('');
  async function load() { try { setRuns(await organizationApi.listRuns(workspaceId, projectId)); setHandoffs(await organizationApi.listHandoffs(workspaceId, projectId)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load reported work.'); } }
  useEffect(() => { void load(); }, [workspaceId, projectId]);
  async function createRun(event: React.FormEvent) { event.preventDefault(); if (!title.trim()) return; try { await organizationApi.createRun(workspaceId, projectId, title); setTitle(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record run.'); } }
  async function createHandoff(run: Run) { try { await organizationApi.createHandoff(workspaceId, projectId, run.id, `Handoff for ${run.title}`); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create handoff.'); } }
  return <div className={styles.stack}><SectionHeader title="Workbench" eyebrow="FORGE / Reported work" /> <p>Runs and handoffs are human-reported records. FORGE does not execute agents or claim delivery evidence.</p>{error && <p role="alert">{error}</p>}<Card><form onSubmit={createRun} className={styles.form}><label htmlFor="run-title">Run title</label><Input id="run-title" value={title} onChange={(event) => setTitle(event.target.value)} required /><Button type="submit">Record Run</Button></form></Card><Card><h3>Runs</h3>{runs.length === 0 ? <p>No reported runs.</p> : runs.map((run) => <article className={styles.item} key={run.id}><div><StatusChip tone="accent">{run.status}</StatusChip><strong>{run.title}</strong></div><div><span>{run.executor_type} / {run.execution_mode}</span><Button variant="secondary" onClick={() => void createHandoff(run)} aria-label={`Create handoff for ${run.title}`}>Create handoff</Button></div></article>)}</Card><Card><h3>Handoffs</h3>{handoffs.length === 0 ? <p>No handoffs.</p> : handoffs.map((handoff) => <article className={styles.item} key={handoff.id}><div><strong>{handoff.title}</strong><p>{handoff.summary || 'Draft summary pending review.'}</p></div><StatusChip tone="accent">{handoff.status}</StatusChip></article>)}</Card></div>;
}
