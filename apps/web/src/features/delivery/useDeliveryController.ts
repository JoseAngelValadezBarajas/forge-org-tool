import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type CandidateHistory,
  type Evidence,
  type ReleaseCandidate,
  type ReleaseManifest,
  type Verification,
} from '@forge-org/api-client';

export type GateEvaluation = {
  id?: string;
  candidate_id: string;
  candidate_revision: number;
  outcome: string;
  input_fingerprint: string;
  blockers: string[];
};

export type VerificationRule = { id: string; label: string; description: string };

export function useDeliveryController(workspaceId: string, projectId: string) {
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

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const [nextEvidence, nextCandidates, nextRules, nextVerifications] = await Promise.all([
          organizationApi.listEvidence(workspaceId, projectId, search, provenance, status),
          organizationApi.listCandidates(workspaceId, projectId),
          organizationApi.listVerificationRules(workspaceId, projectId),
          organizationApi.listVerifications(workspaceId, projectId),
        ]);
        if (!isCurrent()) return;
        setEvidence(nextEvidence);
        setCandidates(nextCandidates);
        setRules(nextRules);
        setVerifications(nextVerifications);
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load delivery records.');
        }
      }
    },
    [projectId, provenance, search, status, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);

  async function addEvidence(event: FormEvent) {
    event.preventDefault();
    if (!evidenceTitle.trim() || !evidenceSummary.trim()) return;
    try {
      await organizationApi.createEvidence(workspaceId, projectId, {
        title: evidenceTitle,
        summary: evidenceSummary,
        provenance: 'REPORTED',
        reference_kind: 'artifact',
        reference_value: 'manual-report',
      });
      setEvidenceTitle('');
      setEvidenceSummary('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record evidence.');
    }
  }

  async function invalidateEvidence(item: Evidence) {
    try {
      await organizationApi.invalidateEvidence(workspaceId, projectId, item.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to invalidate evidence.');
    }
  }

  async function addCandidate(event: FormEvent) {
    event.preventDefault();
    if (!candidateTitle.trim() || !candidateSummary.trim()) return;
    try {
      await organizationApi.createCandidate(
        workspaceId,
        projectId,
        candidateTitle,
        candidateSummary,
      );
      setCandidateTitle('');
      setCandidateSummary('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create candidate.');
    }
  }

  async function updateCandidate(event: FormEvent, item: ReleaseCandidate) {
    event.preventDefault();
    const values = new FormData(event.currentTarget as HTMLFormElement);
    try {
      await organizationApi.updateCandidate(workspaceId, projectId, item.id, {
        title: String(values.get('title') ?? ''),
        summary: String(values.get('summary') ?? ''),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update candidate.');
    }
  }

  async function freezeCandidate(item: ReleaseCandidate) {
    try {
      await organizationApi.freezeCandidate(workspaceId, projectId, item.id, item.revision);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to freeze candidate.');
    }
  }

  async function selectCandidate(candidateId: string) {
    setSelectedCandidateId(candidateId);
    setGate(null);
    setVerification(null);
    setManifest(null);
    try {
      const [history, gates] = await Promise.all([
        organizationApi.listCandidateRevisions(workspaceId, projectId, candidateId),
        organizationApi.listGateEvaluations(workspaceId, projectId, candidateId),
      ]);
      setCandidateHistory(history);
      setGateHistory(gates);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load candidate history.');
    }
  }

  async function previewGates(candidateId: string) {
    await selectCandidate(candidateId);
    try {
      setGate(await organizationApi.previewGates(workspaceId, projectId, candidateId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to preview release gates.');
    }
  }

  async function evaluateGates() {
    if (!selectedCandidateId) return;
    try {
      const result = await organizationApi.evaluateGates(
        workspaceId,
        projectId,
        selectedCandidateId,
      );
      setGate(result);
      setGateHistory(
        await organizationApi.listGateEvaluations(workspaceId, projectId, selectedCandidateId),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to evaluate release gates.');
    }
  }

  async function previewVerification() {
    if (!selectedRuleId) return;
    try {
      setVerification(
        await organizationApi.previewVerification(
          workspaceId,
          projectId,
          selectedRuleId,
          selectedCandidateId || undefined,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to preview verification.');
    }
  }

  async function evaluateVerification() {
    if (!selectedRuleId) return;
    try {
      setVerification(
        await organizationApi.evaluateVerification(
          workspaceId,
          projectId,
          selectedRuleId,
          selectedCandidateId || undefined,
        ),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to evaluate verification.');
    }
  }

  async function saveManifest() {
    if (!selectedCandidateId || !gate?.id || gate.outcome !== 'PASS') return;
    try {
      setManifest(
        await organizationApi.saveManifest(workspaceId, projectId, selectedCandidateId, gate.id),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save release manifest.');
    }
  }

  return {
    addCandidate,
    addEvidence,
    candidateHistory,
    candidateSummary,
    candidateTitle,
    candidates,
    error,
    evidence,
    evidenceSummary,
    evidenceTitle,
    freezeCandidate,
    gate,
    gateHistory,
    invalidateEvidence,
    load,
    manifest,
    previewGates,
    previewVerification,
    provenance,
    rules,
    search,
    selectedCandidateId,
    selectedRuleId,
    setCandidateSummary,
    setCandidateTitle,
    setEvidenceSummary,
    setEvidenceTitle,
    setProvenance,
    setSearch,
    setSelectedRuleId,
    setStatus,
    status,
    updateCandidate,
    evaluateGates,
    evaluateVerification,
    verification,
    verifications,
    saveManifest,
  };
}
