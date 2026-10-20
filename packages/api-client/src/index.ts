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
export type Invariant = { id: string; project_id: string; feature_id: string | null; title: string; statement: string; rationale: string; status: string; revision: number; acknowledged_revision?: number | null; created_at: string; updated_at: string };
export type Task = { id: string; feature_id: string; title: string; description: string | null; status: 'todo' | 'in_progress' | 'done'; position: number; created_at: string; updated_at: string };
export type Dependency = { id: string; project_id: string; blocking_feature_id: string; blocked_feature_id: string; created_at: string; updated_at: string };

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
  createFeature: (workspaceId: string, projectId: string, title: string, epic_id?: string) => sendJson<Feature>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features`, { method: 'POST', body: JSON.stringify({ title, epic_id: epic_id || null }) }),
  createCriterion: (workspaceId: string, projectId: string, featureId: string, description: string) => sendJson(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria`, { method: 'POST', body: JSON.stringify({ description }) }),
  createDecision: (workspaceId: string, projectId: string, values: { title: string; context: string; decision: string; rationale: string }) => sendJson<Decision>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions`, { method: 'POST', body: JSON.stringify(values) }),
  acceptDecision: (workspaceId: string, projectId: string, decisionId: string) => sendJson<Decision>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/accept`, { method: 'POST', body: '{}' }),
  linkDecision: (workspaceId: string, projectId: string, decisionId: string, featureId: string) => sendJson<void>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/features/${featureId}`, { method: 'POST', body: '{}' }),
  createInvariant: (workspaceId: string, projectId: string, values: { title: string; statement: string; rationale: string }) => sendJson<Invariant>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants`, { method: 'POST', body: JSON.stringify(values) }),
  acknowledgeInvariant: (workspaceId: string, projectId: string, featureId: string, invariantId: string, expected_revision: number) => sendJson(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/invariants/${invariantId}/acknowledge`, { method: 'POST', body: JSON.stringify({ expected_revision }) }),
  previewReadiness: (workspaceId: string, projectId: string, featureId: string) => sendJson<ReadinessResult>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/readiness/preview`, { method: 'POST', body: '{}' }),
  saveReadiness: (workspaceId: string, projectId: string, featureId: string) => sendJson<ReadinessResult>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/readiness/evaluations`, { method: 'POST', body: '{}' }),
  createTask: (workspaceId: string, projectId: string, featureId: string, title: string) => sendJson<Task>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  listTasks: (workspaceId: string, projectId: string, featureId: string) => getApiJson<Task[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks` }),
  createDependency: (workspaceId: string, projectId: string, blocking_feature_id: string, blocked_feature_id: string) => sendJson<Dependency>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies`, { method: 'POST', body: JSON.stringify({ blocking_feature_id, blocked_feature_id }) }),
  listDependencies: (workspaceId: string, projectId: string) => getApiJson<Dependency[]>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies` }),
};
