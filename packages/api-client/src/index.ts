/** A narrow same-origin HTTP boundary for the public API. */
export type ApiRequest = { path: `/api/v1/${string}`; signal?: AbortSignal };
export async function getApiJson<T>(request: ApiRequest): Promise<T> {
  const res = await fetch(request.path, { signal: request.signal, credentials: 'same-origin' });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export type Workspace = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type Epic = { id: string; project_id: string; title: string; description: string | null; status: 'planning' | 'archived'; created_at: string; updated_at: string };
export type Feature = { id: string; project_id: string; epic_id: string | null; title: string; description: string | null; goal: string | null; priority: 'low' | 'medium' | 'high' | 'critical'; status: 'backlog' | 'refining' | 'ready' | 'in_progress' | 'verify' | 'done'; created_at: string; updated_at: string };
export type PlanningOverview = { epics: Array<Epic & { features: Feature[] }>; unassigned_features: Feature[] };
export type ReadinessResult = { feature_id: string; evaluated_at: string; rule_set_version: string; input_fingerprint: string; outcome: 'READY_TO_START' | 'NOT_READY'; passed_checks: string[]; failed_checks: string[]; blockers: Array<{ code: string; message: string }>; results: Array<{ rule_id: string; result: string; explanation: string }>; stale?: boolean; evaluation_id?: string };
export type Decision = { id: string; project_id: string; title: string; context: string; decision: string; rationale: string; status: string; revision: number; superseded_by_id: string | null; created_at: string; updated_at: string };
export type DecisionRevision = Decision & { decision_id: string };
export type Invariant = { id: string; project_id: string; feature_id: string | null; title: string; statement: string; rationale: string; status: string; revision: number; acknowledged_revision?: number | null; created_at: string; updated_at: string };
export type InvariantRevision = { id: string; invariant_id: string; revision: number; title: string; statement: string; rationale: string; status: string; feature_id: string | null; created_at: string };
export type Task = { id: string; feature_id: string; title: string; description: string | null; status: 'todo' | 'in_progress' | 'done'; position: number; created_at: string; updated_at: string };
export type Criterion = { id: string; feature_id: string; description: string; satisfied: boolean; position: number; created_at: string; updated_at: string };
export type Dependency = { id: string; project_id: string; blocking_feature_id: string; blocked_feature_id: string; created_at: string; updated_at: string };
export type Repository = { id: string; project_id: string; root_path: string; status: string; created_at: string; updated_at: string };
export type Observation = { id: string; repository_id: string; observed_at: string; head_sha: string | null; branch: string | null; detached: boolean; unborn: boolean; clean: boolean | null; tracked_modified_count: number; staged_count: number; untracked_count: number; observer_version: string; status: string; error_code: string | null; source_content_read: boolean };
export type ContextPackage = { id: string; project_id: string; feature_id: string; schema_version: string; fingerprint: string; payload_json: string; markdown: string; created_at: string };
export type ProjectTransferPreview = { schema_version: string; fingerprint: string; project: { name: string; description?: string | null }; counts: Record<string, number> };
export type Run = { id: string; project_id: string; feature_id: string | null; title: string; description: string | null; execution_mode: string; executor_type: string; status: string; version: number; created_at: string; updated_at: string };
export type Handoff = { id: string; project_id: string; feature_id: string | null; run_id: string; title: string; summary: string; next_actions: string; status: string; current_revision: number | null; version: number; created_at: string; updated_at: string };
export type HandoffRevision = { id: string; handoff_id: string; revision: number; title: string; summary: string; next_actions: string; schema_version: string; fingerprint: string; payload_json: string; markdown: string; created_at: string };
export type Evidence = { id: string; project_id: string; feature_id: string | null; title: string; summary: string; provenance: string; reference_kind: string; reference_value: string; status: string; created_at: string; updated_at: string };
export type ReleaseCandidate = { id: string; project_id: string; title: string; summary: string; status: string; revision: number; fingerprint: string | null; created_at: string; updated_at: string };
export type CandidateHistory = { id: string; candidate_id: string; revision: number; status: string; snapshot_json: string; fingerprint: string; created_at: string };
export type Verification = { id: string | null; project_id: string; rule_id: string; candidate_id: string | null; outcome: string; input_fingerprint: string; blockers: string[]; created_at: string | null; stale: boolean };
export type ReleaseManifest = { id: string; candidate_id: string; gate_evaluation_id: string; schema_version: string; fingerprint: string; status: string; payload_json: string; markdown: string; created_at: string };

async function sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => undefined) as { detail?: string } | undefined;
    throw new Error(detail?.detail ?? `API HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const organizationApi = {
  listWorkspaces: () => getApiJson<Workspace[]>({ path: '/api/v1/workspaces' }),
  createWorkspace: (name: string) => sendJson<Workspace>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  listProjects: (workspaceId: string, search = '', status: 'active' | 'archived' | 'all' = 'active') =>
    getApiJson<Project[]>({ path: `/api/v1/workspaces/${workspaceId}/projects?search=${encodeURIComponent(search)}&status=${status}` as `/api/v1/${string}` }),
  createProject: (workspaceId: string, name: string, description?: string) =>
    sendJson<Project>(`/api/v1/workspaces/${workspaceId}/projects`, { method: 'POST', body: JSON.stringify({ name, description: description || null }) }),
  setProjectStatus: (workspaceId: string, projectId: string, status: 'active' | 'archived') =>
    sendJson<Project>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/${status === 'archived' ? 'archive' : 'restore'}`, { method: 'POST', body: '{}' }),
  planningOverview: (workspaceId: string, projectId: string) => getApiJson<PlanningOverview>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/planning/overview` }),
  createEpic: (workspaceId: string, projectId: string, title: string, description?: string) => sendJson<Epic>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/epics`, { method: 'POST', body: JSON.stringify({ title, description: description || null }) }),
  updateEpic: (workspaceId: string, projectId: string, epicId: string, values: Partial<Pick<Epic, 'title' | 'description' | 'status'>>) => sendJson<Epic>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/epics/${epicId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  createFeature: (workspaceId: string, projectId: string, title: string, epic_id?: string) => sendJson<Feature>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features`, { method: 'POST', body: JSON.stringify({ title, epic_id: epic_id || null }) }),
  updateFeature: (workspaceId: string, projectId: string, featureId: string, values: Partial<Pick<Feature, 'title' | 'description' | 'goal' | 'epic_id' | 'priority' | 'status'>> & { clear_epic?: boolean }) => sendJson<Feature>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  createCriterion: (workspaceId: string, projectId: string, featureId: string, description: string) => sendJson(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria`, { method: 'POST', body: JSON.stringify({ description }) }),
  listCriteria: (workspaceId: string, projectId: string, featureId: string) => getApiJson<Criterion[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria` }),
  createDecision: (workspaceId: string, projectId: string, values: { title: string; context: string; decision: string; rationale: string }) => sendJson<Decision>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions`, { method: 'POST', body: JSON.stringify(values) }),
  listDecisions: (workspaceId: string, projectId: string) => getApiJson<Decision[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions` }),
  updateDecision: (workspaceId: string, projectId: string, decisionId: string, values: Partial<Pick<Decision, 'title' | 'context' | 'decision' | 'rationale'>>) => sendJson<Decision>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  listDecisionRevisions: (workspaceId: string, projectId: string, decisionId: string) => getApiJson<DecisionRevision[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/revisions` }),
  acceptDecision: (workspaceId: string, projectId: string, decisionId: string) => sendJson<Decision>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/accept`, { method: 'POST', body: '{}' }),
  linkDecision: (workspaceId: string, projectId: string, decisionId: string, featureId: string) => sendJson<void>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/features/${featureId}`, { method: 'POST', body: '{}' }),
  listInvariants: (workspaceId: string, projectId: string, featureId?: string) => getApiJson<Invariant[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants${featureId ? `?feature_id=${encodeURIComponent(featureId)}` : ''}` }),
  createInvariant: (workspaceId: string, projectId: string, values: { title: string; statement: string; rationale: string; feature_id?: string }) => sendJson<Invariant>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants`, { method: 'POST', body: JSON.stringify(values) }),
  updateInvariant: (workspaceId: string, projectId: string, invariantId: string, values: Partial<Pick<Invariant, 'title' | 'statement' | 'rationale'>>) => sendJson<Invariant>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants/${invariantId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  listInvariantRevisions: (workspaceId: string, projectId: string, invariantId: string) => getApiJson<InvariantRevision[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants/${invariantId}/revisions` }),
  acknowledgeInvariant: (workspaceId: string, projectId: string, featureId: string, invariantId: string, expected_revision: number) => sendJson(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/invariants/${invariantId}/acknowledge`, { method: 'POST', body: JSON.stringify({ expected_revision }) }),
  previewReadiness: (workspaceId: string, projectId: string, featureId: string) => sendJson<ReadinessResult>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/readiness/preview`, { method: 'POST', body: '{}' }),
  saveReadiness: (workspaceId: string, projectId: string, featureId: string) => sendJson<ReadinessResult>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/readiness/evaluations`, { method: 'POST', body: '{}' }),
  createTask: (workspaceId: string, projectId: string, featureId: string, title: string) => sendJson<Task>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  listTasks: (workspaceId: string, projectId: string, featureId: string) => getApiJson<Task[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks` }),
  updateTask: (workspaceId: string, projectId: string, featureId: string, taskId: string, values: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position'>>) => sendJson<Task>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  reorderTasks: (workspaceId: string, projectId: string, featureId: string, ids: string[]) => sendJson<Task[]>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
  createDependency: (workspaceId: string, projectId: string, blocking_feature_id: string, blocked_feature_id: string) => sendJson<Dependency>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies`, { method: 'POST', body: JSON.stringify({ blocking_feature_id, blocked_feature_id }) }),
  listDependencies: (workspaceId: string, projectId: string) => getApiJson<Dependency[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies` }),
  deleteDependency: (workspaceId: string, projectId: string, dependencyId: string) => sendJson<void>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies/${dependencyId}`, { method: 'DELETE', body: '{}' }),
  listRepositories: (workspaceId: string, projectId: string) => getApiJson<Repository[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories` }),
  connectRepository: (workspaceId: string, projectId: string, root_path: string) => sendJson<Repository>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories`, { method: 'POST', body: JSON.stringify({ root_path }) }),
  listFeatureRepositories: (workspaceId: string, projectId: string, featureId: string) => getApiJson<Repository[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/repositories` }),
  unlinkFeatureRepository: (workspaceId: string, projectId: string, featureId: string, repositoryId: string) => sendJson<void>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/repositories/${repositoryId}`, { method: 'DELETE', body: '{}' }),
  observeRepository: (workspaceId: string, projectId: string, repositoryId: string) => sendJson<Observation>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/observe`, { method: 'POST', body: '{}' }),
  previewContext: (workspaceId: string, projectId: string, featureId: string) => sendJson<{ schema_version: string; fingerprint: string; payload: unknown; markdown: string }>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/preview`, { method: 'POST', body: '{}' }),
  saveContext: (workspaceId: string, projectId: string, featureId: string) => sendJson<ContextPackage>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages`, { method: 'POST', body: '{}' }),
  getContextPackage: (workspaceId: string, projectId: string, featureId: string, packageId: string) => getApiJson<ContextPackage>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages/${packageId}` }),
  previewProjectImport: (workspaceId: string, document: unknown) => sendJson<ProjectTransferPreview>(`/api/v1/workspaces/${workspaceId}/projects/import/preview`, { method: 'POST', body: JSON.stringify(document) }),
  importProject: (workspaceId: string, document: unknown, expected_fingerprint: string) => sendJson<{ project_id: string; fingerprint: string }>(`/api/v1/workspaces/${workspaceId}/projects/import`, { method: 'POST', body: JSON.stringify({ document, expected_fingerprint }) }),
  exportProject: (workspaceId: string, projectId: string) => getApiJson<unknown>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/export` }),
  listRuns: (workspaceId: string, projectId: string, status = '', search = '') => getApiJson<Run[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}` as `/api/v1/${string}` }),
  getRun: (workspaceId: string, projectId: string, runId: string) => getApiJson<Run>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs/${runId}` }),
  createRun: (workspaceId: string, projectId: string, title: string, feature_id?: string) => sendJson<Run>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs`, { method: 'POST', body: JSON.stringify({ title, feature_id, execution_mode: 'manual', executor_type: 'human' }) }),
  listHandoffs: (workspaceId: string, projectId: string) => getApiJson<Handoff[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs` }),
  listHandoffRevisions: (workspaceId: string, projectId: string, handoffId: string) => getApiJson<HandoffRevision[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/revisions` }),
  createHandoff: (workspaceId: string, projectId: string, runId: string, title: string) => sendJson<Handoff>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs/${runId}/handoffs`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateHandoff: (workspaceId: string, projectId: string, handoffId: string, values: { expected_version: number; title?: string; summary?: string; next_actions?: string }) => sendJson<Handoff>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  readyHandoff: (workspaceId: string, projectId: string, handoffId: string, expected_version: number) => sendJson<Handoff>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/ready`, { method: 'POST', body: JSON.stringify({ expected_version }) }),
  acknowledgeHandoff: (workspaceId: string, projectId: string, handoffId: string, expected_revision: number, acknowledged_by: string) => sendJson<{ id: string; handoff_id: string; revision: number; acknowledged_by: string }>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/acknowledge`, { method: 'POST', body: JSON.stringify({ expected_revision, acknowledged_by }) }),
  listEvidence: (workspaceId: string, projectId: string, search = '', provenance = '', status = '') => getApiJson<Evidence[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence?search=${encodeURIComponent(search)}&provenance=${encodeURIComponent(provenance)}&status=${encodeURIComponent(status)}` as `/api/v1/${string}` }),
  getEvidence: (workspaceId: string, projectId: string, evidenceId: string) => getApiJson<Evidence>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence/${evidenceId}` }),
  listVerificationRules: (workspaceId: string, projectId: string) => getApiJson<Array<{ id: string; label: string; description: string }>>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications/rules` }),
  previewVerification: (workspaceId: string, projectId: string, rule_id: string, candidate_id?: string) => sendJson<Verification>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications/preview`, { method: 'POST', body: JSON.stringify({ rule_id, candidate_id }) }),
  evaluateVerification: (workspaceId: string, projectId: string, rule_id: string, candidate_id?: string) => sendJson<Verification>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications/evaluate`, { method: 'POST', body: JSON.stringify({ rule_id, candidate_id }) }),
  listVerifications: (workspaceId: string, projectId: string) => getApiJson<Verification[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/verifications` }),
  createEvidence: (workspaceId: string, projectId: string, values: { title: string; summary: string; provenance: string; reference_kind: string; reference_value: string }) => sendJson<Evidence>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/evidence`, { method: 'POST', body: JSON.stringify(values) }),
  listCandidates: (workspaceId: string, projectId: string) => getApiJson<ReleaseCandidate[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates` }),
  createCandidate: (workspaceId: string, projectId: string, title: string, summary: string) => sendJson<ReleaseCandidate>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates`, { method: 'POST', body: JSON.stringify({ title, summary }) }),
  getCandidate: (workspaceId: string, projectId: string, candidateId: string) => getApiJson<ReleaseCandidate>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}` }),
  updateCandidate: (workspaceId: string, projectId: string, candidateId: string, values: { title?: string; summary?: string }) => sendJson<ReleaseCandidate>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}`, { method: 'PATCH', body: JSON.stringify(values) }),
  listCandidateRevisions: (workspaceId: string, projectId: string, candidateId: string) => getApiJson<CandidateHistory[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/revisions` }),
  freezeCandidate: (workspaceId: string, projectId: string, candidateId: string, revision: number) => sendJson<ReleaseCandidate>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/freeze`, { method: 'POST', body: JSON.stringify({ expected_revision: revision }) }),
  previewGates: (workspaceId: string, projectId: string, candidateId: string) => sendJson<{ outcome: string; blockers: string[] }>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/gates/preview`, { method: 'POST', body: '{}' }),
  evaluateGates: (workspaceId: string, projectId: string, candidateId: string) => sendJson<{ id: string; outcome: string; blockers: string[] }>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/gates/evaluate`, { method: 'POST', body: '{}' }),
  listGateEvaluations: (workspaceId: string, projectId: string, candidateId: string) => getApiJson<Array<{ id: string; candidate_id: string; candidate_revision: number; outcome: string; input_fingerprint: string; blockers: string[] }>>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/gates` }),
  getManifest: (workspaceId: string, projectId: string, candidateId: string) => getApiJson<ReleaseManifest>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/manifest` }),
  saveManifest: (workspaceId: string, projectId: string, candidateId: string, gate_evaluation_id: string) => sendJson<ReleaseManifest>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${candidateId}/manifest`, { method: 'POST', body: JSON.stringify({ gate_evaluation_id }) }),
};
