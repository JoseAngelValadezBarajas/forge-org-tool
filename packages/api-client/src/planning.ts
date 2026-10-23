import { getApiJson, sendJson } from './transport.js';
import type {
  Criterion,
  Decision,
  DecisionRevision,
  Dependency,
  Epic,
  Feature,
  Invariant,
  InvariantRevision,
  PlanningOverview,
  Task,
} from './types.js';

export const planningCapability = {
  planningOverview: (workspaceId: string, projectId: string) =>
    getApiJson<PlanningOverview>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/planning/overview`,
    }),
  createEpic: (workspaceId: string, projectId: string, title: string, description?: string) =>
    sendJson<Epic>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/epics`, {
      method: 'POST',
      body: JSON.stringify({ title, description: description || null }),
    }),
  updateEpic: (
    workspaceId: string,
    projectId: string,
    epicId: string,
    values: Partial<Pick<Epic, 'title' | 'description' | 'status'>>,
  ) =>
    sendJson<Epic>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/epics/${epicId}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    }),
  createFeature: (workspaceId: string, projectId: string, title: string, epic_id?: string) =>
    sendJson<Feature>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features`, {
      method: 'POST',
      body: JSON.stringify({ title, epic_id: epic_id || null }),
    }),
  updateFeature: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    values: Partial<
      Pick<Feature, 'title' | 'description' | 'goal' | 'epic_id' | 'priority' | 'status'>
    > & { clear_epic?: boolean },
  ) =>
    sendJson<Feature>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  createCriterion: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    description: string,
  ) =>
    sendJson<Criterion>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria`,
      { method: 'POST', body: JSON.stringify({ description }) },
    ),
  listCriteria: (workspaceId: string, projectId: string, featureId: string) =>
    getApiJson<Criterion[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria`,
    }),
  createDecision: (
    workspaceId: string,
    projectId: string,
    values: { title: string; context: string; decision: string; rationale: string },
  ) =>
    sendJson<Decision>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions`, {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  listDecisions: (workspaceId: string, projectId: string) =>
    getApiJson<Decision[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions`,
    }),
  updateDecision: (
    workspaceId: string,
    projectId: string,
    decisionId: string,
    values: Partial<Pick<Decision, 'title' | 'context' | 'decision' | 'rationale'>>,
  ) =>
    sendJson<Decision>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  listDecisionRevisions: (workspaceId: string, projectId: string, decisionId: string) =>
    getApiJson<DecisionRevision[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/revisions`,
    }),
  acceptDecision: (workspaceId: string, projectId: string, decisionId: string) =>
    sendJson<Decision>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/accept`,
      { method: 'POST', body: '{}' },
    ),
  linkDecision: (workspaceId: string, projectId: string, decisionId: string, featureId: string) =>
    sendJson<void>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/decisions/${decisionId}/features/${featureId}`,
      { method: 'POST', body: '{}' },
    ),
  listInvariants: (workspaceId: string, projectId: string, featureId?: string) =>
    getApiJson<Invariant[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants${featureId ? `?feature_id=${encodeURIComponent(featureId)}` : ''}`,
    }),
  createInvariant: (
    workspaceId: string,
    projectId: string,
    values: { title: string; statement: string; rationale: string; feature_id?: string },
  ) =>
    sendJson<Invariant>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants`, {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  updateInvariant: (
    workspaceId: string,
    projectId: string,
    invariantId: string,
    values: Partial<Pick<Invariant, 'title' | 'statement' | 'rationale'>>,
  ) =>
    sendJson<Invariant>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants/${invariantId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  listInvariantRevisions: (workspaceId: string, projectId: string, invariantId: string) =>
    getApiJson<InvariantRevision[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/invariants/${invariantId}/revisions`,
    }),
  acknowledgeInvariant: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    invariantId: string,
    expected_revision: number,
  ) =>
    sendJson<void>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/invariants/${invariantId}/acknowledge`,
      { method: 'POST', body: JSON.stringify({ expected_revision }) },
    ),
  createTask: (workspaceId: string, projectId: string, featureId: string, title: string) =>
    sendJson<Task>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks`,
      { method: 'POST', body: JSON.stringify({ title }) },
    ),
  listTasks: (workspaceId: string, projectId: string, featureId: string) =>
    getApiJson<Task[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks`,
    }),
  updateTask: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    taskId: string,
    values: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position'>>,
  ) =>
    sendJson<Task>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks/${taskId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  reorderTasks: (workspaceId: string, projectId: string, featureId: string, ids: string[]) =>
    sendJson<Task[]>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/tasks/reorder`,
      { method: 'POST', body: JSON.stringify({ ids }) },
    ),
  createDependency: (
    workspaceId: string,
    projectId: string,
    blocking_feature_id: string,
    blocked_feature_id: string,
  ) =>
    sendJson<Dependency>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ blocking_feature_id, blocked_feature_id }),
    }),
  listDependencies: (workspaceId: string, projectId: string) =>
    getApiJson<Dependency[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies`,
    }),
  deleteDependency: (workspaceId: string, projectId: string, dependencyId: string) =>
    sendJson<void>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/dependencies/${dependencyId}`,
      { method: 'DELETE', body: '{}' },
    ),
};
