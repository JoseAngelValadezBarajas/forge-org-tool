import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SearchField, SectionHeader, Select, StatusChip } from '@forge-org/ui';
import { organizationApi, type CandidateHistory, type Evidence, type ReleaseCandidate, type ReleaseManifest, type Verification } from '@forge-org/api-client';
import styles from './DeliveryPage.module.css';

type GateEvaluation = { id?: string; candidate_id: string; candidate_revision: number; outcome: string; input_fingerprint: string; blockers: string[] };
type VerificationRule = { id: string; label: string; description: string };

export function DeliveryPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [rules, setRules] = useState<VerificationRule[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [candidateHistory, setCandidateHistory] = useState<CandidateHistory[]>([]);
  const [gateHistory, setGateHistory] = useState<GateEvaluation[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [candidateTitle, setCandidateTitle] = useState('');
  const [candidateSummary, setCandidateSummary] = useState('');
  const [search, setSearch] = useState('');
  const [provenance, setProvenance] = useState('');
  const [status, setStatus] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('verified-evidence-present');
  const [gate, setGate] = useState<GateEvaluation | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [manifest, setManifest] = useState<ReleaseManifest | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [nextEvidence, nextCandidates, nextRules, nextVerifications] = await Promise.all([
        organizationApi.listEvidence(workspaceId, projectId, search, provenance, status),
        organizationApi.listCandidates(workspaceId, projectId),
        organizationApi.listVerificationRules(workspaceId, projectId),
        organizationApi.listVerifications(workspaceId, projectId),
      ]);
      setEvidence(nextEvidence); setCandidates(nextCandidates); setRules(nextRules); setVerifications(nextVerifications);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load delivery records.'); }
  }
  useEffect(() => { void load(); }, [workspaceId, projectId]);

  async function addEvidence(event: FormEvent) { event.preventDefault(); if (!evidenceTitle.trim() || !evidenceSummary.trim()) return; try { await organizationApi.createEvidence(workspaceId, projectId, { title: evidenceTitle, summary: evidenceSummary, provenance: 'REPORTED', reference_kind: 'artifact', reference_value: 'manual-report' }); setEvidenceTitle(''); setEvidenceSummary(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record evidence.'); } }
  async function invalidateEvidence(item: Evidence) { try { await organizationApi.invalidateEvidence(workspaceId, projectId, item.id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to invalidate evidence.'); } }
  async function addCandidate(event: FormEvent) { event.preventDefault(); if (!candidateTitle.trim() || !candidateSummary.trim()) return; try { await organizationApi.createCandidate(workspaceId, projectId, candidateTitle, candidateSummary); setCandidateTitle(''); setCandidateSummary(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create candidate.'); } }
  async function updateCandidate(event: FormEvent, item: ReleaseCandidate) { event.preventDefault(); const values = new FormData(event.currentTarget as HTMLFormElement); try { await organizationApi.updateCandidate(workspaceId, projectId, item.id, { title: String(values.get('title') ?? ''), summary: String(values.get('summary') ?? '') }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update candidate.'); } }
  async function freezeCandidate(item: ReleaseCandidate) { try { await organizationApi.freezeCandidate(workspaceId, projectId, item.id, item.revision); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to freeze candidate.'); } }
  async function selectCandidate(candidateId: string) { setSelectedCandidateId(candidateId); setGate(null); setVerification(null); setManifest(null); try { const [history, gates] = await Promise.all([organizationApi.listCandidateRevisions(workspaceId, projectId, candidateId), organizationApi.listGateEvaluations(workspaceId, projectId, candidateId)]); setCandidateHistory(history); setGateHistory(gates); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load candidate history.'); } }
  async function previewGates(candidateId: string) { await selectCandidate(candidateId); try { setGate(await organizationApi.previewGates(workspaceId, projectId, candidateId)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to preview release gates.'); } }
  async function evaluateGates() { if (!selectedCandidateId) return; try { const result = await organizationApi.evaluateGates(workspaceId, projectId, selectedCandidateId); setGate(result); setGateHistory(await organizationApi.listGateEvaluations(workspaceId, projectId, selectedCandidateId)); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to evaluate release gates.'); } }
  async function previewVerification() { if (!selectedRuleId) return; try { setVerification(await organizationApi.previewVerification(workspaceId, projectId, selectedRuleId, selectedCandidateId || undefined)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to preview verification.'); } }
  async function evaluateVerification() { if (!selectedRuleId) return; try { setVerification(await organizationApi.evaluateVerification(workspaceId, projectId, selectedRuleId, selectedCandidateId || undefined)); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to evaluate verification.'); } }
  async function saveManifest() { if (!selectedCandidateId || !gate?.id || gate.outcome !== 'PASS') return; try { setManifest(await organizationApi.saveManifest(workspaceId, projectId, selectedCandidateId, gate.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save release manifest.'); } }
  const downloadPath = (format: 'json' | 'markdown') => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${selectedCandidateId}/manifest/download?format=${format}`;
  const selectedCandidate = candidates.find((item) => item.id === selectedCandidateId);

  return <div className={styles.stack}>
    <SectionHeader title="Delivery overview" eyebrow="FORGE / Truth states" />
    <p>Evidence provenance and gates are explicit. A blocked gate is not a publication or deployment claim.</p>
    {error && <p role="alert">{error}</p>}
    <div className={styles.summaryGrid} aria-label="Delivery summary">
      <Card><span className={styles.metricLabel}>Evidence</span><strong className={styles.metricValue}>{evidence.length}</strong><small>reported records</small></Card>
      <Card><span className={styles.metricLabel}>Candidates</span><strong className={styles.metricValue}>{candidates.length}</strong><small>reviewable snapshots</small></Card>
      <Card><span className={styles.metricLabel}>Rules</span><strong className={styles.metricValue}>{rules.length}</strong><small>deterministic checks</small></Card>
      <Card><span className={styles.metricLabel}>Release</span><strong className={styles.metricValue}>NOT_PUBLISHED</strong><small>no deployment claim</small></Card>
    </div>
    <Card><h2>Delivery verification</h2><p>Candidate checks are deterministic and retained with their input fingerprint.</p><StatusChip tone="warning">NOT_PUBLISHED</StatusChip><p>Manifests are planning artifacts only, not a deployment or publication.</p></Card>
    <div className={styles.forms}><Card><form onSubmit={addEvidence}><h3>Reported evidence</h3><Input aria-label="Evidence title" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="Title" /><Input aria-label="Evidence summary" value={evidenceSummary} onChange={(event) => setEvidenceSummary(event.target.value)} placeholder="Summary" /><Button type="submit">Record Evidence</Button></form></Card><Card><form onSubmit={addCandidate}><h3>Release candidate</h3><Input aria-label="New candidate title" value={candidateTitle} onChange={(event) => setCandidateTitle(event.target.value)} placeholder="Title" /><Input aria-label="New candidate summary" value={candidateSummary} onChange={(event) => setCandidateSummary(event.target.value)} placeholder="Summary" /><Button type="submit">Create Candidate</Button></form></Card></div>
    <Card><h3>Evidence</h3><div className={styles.filters}><SearchField aria-label="Evidence search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search evidence" /><FormField label="Evidence provenance"><Select aria-label="Evidence provenance" value={provenance} onChange={(event) => setProvenance(event.target.value)}><option value="">All provenance</option><option value="REPORTED">REPORTED</option><option value="OBSERVED">OBSERVED</option><option value="VERIFIED">VERIFIED</option><option value="UNKNOWN">UNKNOWN</option></Select></FormField><FormField label="Evidence status"><Select aria-label="Evidence status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All status</option><option value="ACTIVE">ACTIVE</option><option value="INVALIDATED">INVALIDATED</option></Select></FormField><Button type="button" variant="secondary" onClick={() => void load()}>Apply evidence filters</Button></div>{evidence.length === 0 ? <p>No evidence records.</p> : evidence.map((item) => <article className={styles.item} key={item.id}><div><strong>{item.title}</strong><p>{item.summary}</p></div><div><StatusChip tone="accent">{item.provenance} / {item.status}</StatusChip>{item.status === 'ACTIVE' && <Button type="button" variant="secondary" onClick={() => void invalidateEvidence(item)} aria-label={`Invalidate ${item.title}`}>Invalidate</Button>}</div></article>)}</Card>
    <Card><h3>Release candidates</h3>{candidates.length === 0 ? <p>No candidates.</p> : candidates.map((item) => <article className={styles.item} key={item.id}><div>{item.status === 'DRAFT' ? <form onSubmit={(event) => void updateCandidate(event, item)} className={styles.form}><Input name="title" aria-label="Candidate title" defaultValue={item.title} /><Input name="summary" aria-label="Candidate summary" defaultValue={item.summary} /><Button type="submit">Save candidate</Button></form> : <strong>{item.title}</strong>}<p>{item.summary}</p><StatusChip tone={item.status === 'FROZEN' ? 'warning' : 'neutral'}>{item.status}</StatusChip><small>Revision {item.revision}{item.fingerprint ? ` · ${item.fingerprint}` : ''}</small></div><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => void previewGates(item.id)} aria-label={`Preview gates for ${item.title}`}>Preview gates</Button>{item.status === 'DRAFT' && <Button type="button" variant="secondary" onClick={() => void freezeCandidate(item)} aria-label={`Freeze ${item.title}`}>Freeze</Button>}</div></article>)}</Card>
    {selectedCandidate && <Card><h3>Candidate history</h3>{candidateHistory.length === 0 ? <p>No candidate revisions.</p> : candidateHistory.map((item) => <p key={item.id}>Revision {item.revision}: {item.status} · {item.fingerprint}</p>)}<h3>Gate history</h3>{gateHistory.length === 0 ? <p>No gate evaluations.</p> : gateHistory.map((item) => <p key={item.id}>{item.outcome} · {item.input_fingerprint}</p>)}</Card>}
    {selectedCandidate && <Card><h3>Verification rules</h3><FormField label="Verification rule"><Select aria-label="Verification rule" value={selectedRuleId} onChange={(event) => setSelectedRuleId(event.target.value)}>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.label}</option>)}</Select></FormField><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => void previewVerification()}>Preview verification</Button><Button type="button" onClick={() => void evaluateVerification()}>Evaluate verification</Button></div>{verification && <div className={styles.result}><StatusChip tone={verification.outcome === 'PASS' ? 'success' : 'warning'}>{verification.outcome}</StatusChip><p>Input fingerprint: {verification.input_fingerprint}</p>{verification.stale && <p>STALE evaluation: referenced inputs changed.</p>}{verification.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</div>}{verifications.map((item) => <p key={item.id ?? item.rule_id}>{item.rule_id}: {item.outcome}{item.stale ? ' / STALE' : ''}</p>)}</Card>}
    {selectedCandidate && <Card><h3>Gate evaluation</h3>{gate ? <><StatusChip tone={gate.outcome === 'PASS' ? 'success' : 'warning'}>{gate.outcome}</StatusChip><p>Input fingerprint: {gate.input_fingerprint}</p>{gate.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}<div className={styles.actions}><Button type="button" variant="secondary" onClick={() => void evaluateGates()}>Evaluate gates</Button><Button type="button" onClick={() => void saveManifest()} disabled={gate.outcome !== 'PASS' || !gate.id}>Save NOT_PUBLISHED manifest</Button></div></> : <p>Select Preview gates to inspect this candidate.</p>}</Card>}
    {manifest && <Card><h3>Manifest</h3><StatusChip tone="warning">{manifest.status}</StatusChip><p>{manifest.schema_version} / {manifest.fingerprint}</p><p>{manifest.markdown}</p><div className={styles.actions}><a href={downloadPath('json')}>JSON</a><a href={downloadPath('markdown')}>Markdown</a></div></Card>}
  </div>;
}
