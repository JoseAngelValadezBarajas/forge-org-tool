import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type Decision, type DecisionRevision, type Invariant, type ReadinessResult } from '@forge-org/api-client';
import styles from './ReadinessPage.module.css';

export function ReadinessPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [invariants, setInvariants] = useState<Invariant[]>([]);
  const [decisionRevisions, setDecisionRevisions] = useState<Record<string, DecisionRevision[]>>({});
  const [criterion, setCriterion] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [invariantTitle, setInvariantTitle] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [nextReadiness, nextDecisions, nextInvariants] = await Promise.all([
        organizationApi.previewReadiness(workspaceId, projectId, featureId),
        organizationApi.listDecisions(workspaceId, projectId),
        organizationApi.listInvariants(workspaceId, projectId, featureId),
      ]);
      setResult(nextReadiness);
      setDecisions(nextDecisions);
      setInvariants(nextInvariants);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to evaluate readiness.'); }
  }
  useEffect(() => { void refresh(); }, [workspaceId, projectId, featureId]);

  async function addCriterion(event: React.FormEvent) {
    event.preventDefault();
    if (!criterion.trim()) return;
    try { await organizationApi.createCriterion(workspaceId, projectId, featureId, criterion); setCriterion(''); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add criterion.'); }
  }
  async function addDecision(event: React.FormEvent) {
    event.preventDefault();
    if (!decisionTitle.trim()) return;
    try {
      const decision = await organizationApi.createDecision(workspaceId, projectId, { title: decisionTitle, context: 'Recorded in FORGE planning', decision: decisionTitle, rationale: 'Explicit product context' });
      await organizationApi.linkDecision(workspaceId, projectId, decision.id, featureId);
      setDecisionTitle('');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record decision.'); }
  }
  async function addInvariant(event: React.FormEvent) {
    event.preventDefault();
    if (!invariantTitle.trim()) return;
    try { await organizationApi.createInvariant(workspaceId, projectId, { title: invariantTitle, statement: invariantTitle, rationale: 'Explicit product invariant', feature_id: featureId }); setInvariantTitle(''); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record invariant.'); }
  }
  async function acceptDecision(decision: Decision) {
    try { await organizationApi.acceptDecision(workspaceId, projectId, decision.id); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to accept decision.'); }
  }
  async function showDecisionRevisions(decision: Decision) {
    try {
      const revisions = await organizationApi.listDecisionRevisions(workspaceId, projectId, decision.id);
      setDecisionRevisions((current) => ({ ...current, [decision.id]: revisions }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load decision history.'); }
  }
  async function acknowledgeInvariant(invariant: Invariant) {
    try { await organizationApi.acknowledgeInvariant(workspaceId, projectId, featureId, invariant.id, invariant.revision); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to acknowledge invariant.'); }
  }

  return <div className={styles.stack}>
    <SectionHeader title="Readiness" eyebrow="FORGE / Planning gate" />
    <p>This is a deterministic planning evaluation, not delivery, CI, deployment, or technical verification.</p>
    {error && <p role="alert">{error}</p>}
    <Card><div className={styles.result}><StatusChip tone={result?.outcome === 'READY_TO_START' ? 'success' : 'warning'}>{result?.outcome ?? 'Evaluating'}</StatusChip><Button variant="secondary" onClick={() => void refresh()}>Refresh evaluation</Button></div>{result && <><p>Rules passed: {result.passed_checks.join(', ') || 'none'}</p><ul>{result.blockers.map((blocker) => <li key={blocker.code}>{blocker.code}: {blocker.message}</li>)}</ul></>}</Card>
    <div className={styles.forms}>
      <Card><form onSubmit={addCriterion}><h3>Acceptance criteria</h3><Input aria-label="Acceptance criterion" value={criterion} onChange={(event) => setCriterion(event.target.value)} placeholder="Describe expected behavior" /><Button type="submit">Add criterion</Button></form></Card>
      <Card><form onSubmit={addDecision}><h3>Decision</h3><Input aria-label="Decision title" value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} placeholder="Record a decision" /><Button type="submit">Link decision</Button></form></Card>
      <Card><form onSubmit={addInvariant}><h3>Invariant</h3><Input aria-label="Invariant title" value={invariantTitle} onChange={(event) => setInvariantTitle(event.target.value)} placeholder="Record a rule" /><Button type="submit">Add invariant</Button></form></Card>
    </div>
    <Card><h3>Decisions</h3>{decisions.length === 0 ? <p>No decisions recorded.</p> : decisions.map((decision) => <article key={decision.id}><div><strong>{decision.title}</strong><p>Revision {decision.revision} · {decision.status}</p><p>{decision.decision}</p></div><div><Button type="button" variant="secondary" onClick={() => void showDecisionRevisions(decision)} aria-label={`Show decision revisions for ${decision.title}`}>History</Button>{decision.status !== 'ACCEPTED' && <Button type="button" onClick={() => void acceptDecision(decision)}>Accept decision</Button>}</div>{decisionRevisions[decision.id] && <ul>{decisionRevisions[decision.id].map((revision) => <li key={revision.id}>Revision {revision.revision}: {revision.decision}</li>)}</ul>}</article>)}</Card>
    <Card><h3>Invariants</h3>{invariants.length === 0 ? <p>No invariants recorded.</p> : invariants.map((invariant) => <article key={invariant.id}><div><strong>{invariant.title}</strong><p>Revision {invariant.revision} · {invariant.status}</p><p>{invariant.statement}</p></div>{invariant.feature_id === featureId && invariant.acknowledged_revision !== invariant.revision && <Button type="button" onClick={() => void acknowledgeInvariant(invariant)} aria-label={`Acknowledge invariant ${invariant.title}`}>Acknowledge invariant</Button>}{invariant.acknowledged_revision === invariant.revision && <StatusChip tone="success">Acknowledged revision {invariant.revision}</StatusChip>}</article>)}</Card>
  </div>;
}
