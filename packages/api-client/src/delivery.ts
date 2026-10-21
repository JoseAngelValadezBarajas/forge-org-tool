import { getApiJson, sendJson } from './transport';
import type {
  CandidateHistory,
  Evidence,
  ReleaseCandidate,
  ReleaseManifest,
  Verification,
} from './types';

export type GateEvaluation = {
  id?: string;
  candidate_id: string;
  candidate_revision: number;
  outcome: string;
  input_fingerprint: string;
  blockers: string[];
};

export const deliveryCapability = {
  listEvidence: (
    workspaceId: string,
    projectId: string,
    search = '',
    provenance = '',
    status = '',
  ) =>
    getApiJson<Evidence[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence?search=${encodeURIComponent(search)}&provenance=${encodeURIComponent(provenance)}&status=${encodeURIComponent(status)}` as `/api/v1/${string}`,
    }),
  getEvidence: (workspaceId: string, projectId: string, evidenceId: string) =>
    getApiJson<Evidence>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence/${evidenceId}`,
    }),
  listVerificationRules: (workspaceId: string, projectId: string) =>
    getApiJson<Array<{ id: string; label: string; description: string }>>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications/rules`,
    }),
  previewVerification: (
    workspaceId: string,
    projectId: string,
    rule_id: string,
    candidate_id?: string,
  ) =>
    sendJson<Verification>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications/preview`,
      { method: 'POST', body: JSON.stringify({ rule_id, candidate_id }) },
    ),
  evaluateVerification: (
    workspaceId: string,
    projectId: string,
    rule_id: string,
    candidate_id?: string,
  ) =>
    sendJson<Verification>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications/evaluate`,
      { method: 'POST', body: JSON.stringify({ rule_id, candidate_id }) },
    ),
  listVerifications: (workspaceId: string, projectId: string) =>
    getApiJson<Verification[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications`,
    }),
  createEvidence: (
    workspaceId: string,
    projectId: string,
    values: {
      title: string;
      summary: string;
      provenance: string;
      reference_kind: string;
      reference_value: string;
    },
  ) =>
    sendJson<Evidence>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  invalidateEvidence: (workspaceId: string, projectId: string, evidenceId: string) =>
    sendJson<Evidence>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence/${evidenceId}/invalidate`,
      { method: 'POST', body: '{}' },
    ),
  listCandidates: (workspaceId: string, projectId: string) =>
    getApiJson<ReleaseCandidate[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates`,
    }),
  createCandidate: (workspaceId: string, projectId: string, title: string, summary: string) =>
    sendJson<ReleaseCandidate>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates`,
      { method: 'POST', body: JSON.stringify({ title, summary }) },
    ),
  getCandidate: (workspaceId: string, projectId: string, candidateId: string) =>
    getApiJson<ReleaseCandidate>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}`,
    }),
  updateCandidate: (
    workspaceId: string,
    projectId: string,
    candidateId: string,
    values: { title?: string; summary?: string },
  ) =>
    sendJson<ReleaseCandidate>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  listCandidateRevisions: (workspaceId: string, projectId: string, candidateId: string) =>
    getApiJson<CandidateHistory[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/revisions`,
    }),
  freezeCandidate: (
    workspaceId: string,
    projectId: string,
    candidateId: string,
    revision: number,
  ) =>
    sendJson<ReleaseCandidate>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/freeze`,
      { method: 'POST', body: JSON.stringify({ expected_revision: revision }) },
    ),
  previewGates: (workspaceId: string, projectId: string, candidateId: string) =>
    sendJson<GateEvaluation>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/gates/preview`,
      { method: 'POST', body: '{}' },
    ),
  evaluateGates: (workspaceId: string, projectId: string, candidateId: string) =>
    sendJson<GateEvaluation & { id: string }>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/gates/evaluate`,
      { method: 'POST', body: '{}' },
    ),
  listGateEvaluations: (workspaceId: string, projectId: string, candidateId: string) =>
    getApiJson<GateEvaluation[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/gates`,
    }),
  getManifest: (workspaceId: string, projectId: string, candidateId: string) =>
    getApiJson<ReleaseManifest>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/manifest`,
    }),
  saveManifest: (
    workspaceId: string,
    projectId: string,
    candidateId: string,
    gate_evaluation_id: string,
  ) =>
    sendJson<ReleaseManifest>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/manifest`,
      { method: 'POST', body: JSON.stringify({ gate_evaluation_id }) },
    ),
};
