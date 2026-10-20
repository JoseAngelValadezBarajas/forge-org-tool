import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type ReadinessResult } from '@forge-org/api-client';
import styles from './ReadinessPage.module.css';

export function ReadinessPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [criterion, setCriterion] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [invariantTitle, setInvariantTitle] = useState('');
  const [error, setError] = useState('');
  async function refresh() { try { setResult(await organizationApi.previewReadiness(workspaceId, projectId, featureId)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to evaluate readiness.'); } }
  useEffect(() => { void refresh(); }, [workspaceId, projectId, featureId]);
  async function addCriterion(event: React.FormEvent) { event.preventDefault(); if (!criterion.trim()) return; await organizationApi.createCriterion(workspaceId, projectId, featureId, criterion); setCriterion(''); await refresh(); }
  async function addDecision(event: React.FormEvent) { event.preventDefault(); if (!decisionTitle.trim()) return; const decision = await organizationApi.createDecision(workspaceId, projectId, { title: decisionTitle, context: 'Recorded in FORGE planning', decision: decisionTitle, rationale: 'Explicit product context' }); await organizationApi.linkDecision(workspaceId, projectId, decision.id, featureId); setDecisionTitle(''); await refresh(); }
  async function addInvariant(event: React.FormEvent) { event.preventDefault(); if (!invariantTitle.trim()) return; await organizationApi.createInvariant(workspaceId, projectId, { title: invariantTitle, statement: invariantTitle, rationale: 'Explicit product invariant' }); setInvariantTitle(''); await refresh(); }
  return <div className={styles.stack}><SectionHeader title="Readiness" eyebrow="FORGE / Planning gate" /><p>This is a deterministic planning evaluation, not delivery, CI, deployment, or technical verification.</p>{error && <p role="alert">{error}</p>}<Card><div className={styles.result}><StatusChip tone={result?.outcome === 'READY_TO_START' ? 'success' : 'warning'}>{result?.outcome ?? 'Evaluating'}</StatusChip><Button variant="secondary" onClick={() => void refresh()}>Refresh evaluation</Button></div>{result && <><p>Rules passed: {result.passed_checks.join(', ') || 'none'}</p><ul>{result.blockers.map((blocker) => <li key={blocker.code}>{blocker.code}: {blocker.message}</li>)}</ul></>}</Card><div className={styles.forms}><Card><form onSubmit={addCriterion}><h3>Acceptance criteria</h3><Input aria-label="Acceptance criterion" value={criterion} onChange={(event) => setCriterion(event.target.value)} placeholder="Describe expected behavior" /><Button type="submit">Add criterion</Button></form></Card><Card><form onSubmit={addDecision}><h3>Decision</h3><Input aria-label="Decision title" value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} placeholder="Record a decision" /><Button type="submit">Link decision</Button></form></Card><Card><form onSubmit={addInvariant}><h3>Invariant</h3><Input aria-label="Invariant title" value={invariantTitle} onChange={(event) => setInvariantTitle(event.target.value)} placeholder="Record a rule" /><Button type="submit">Add invariant</Button></form></Card></div></div>;
}
