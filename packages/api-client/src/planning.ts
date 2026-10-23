import { getApiJson, sendJson } from './transport.js';
import type {
  Criterion,
  BugAttachment,
  Dependency,
  Epic,
  EpicUpdate,
  Feature,
  PlanningOverview,
  Task,
  WorkspaceTag,
} from './types.js';

export const planningCapability = {
  planningOverview: (workspaceId: string, projectId: string) =>
    getApiJson<PlanningOverview>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/planning/overview`,
    }),
  listWorkspaceTags: (workspaceId: string) =>
    getApiJson<WorkspaceTag[]>({ path: `/api/v1/workspaces/${workspaceId}/tags` }),
  createWorkspaceTag: (workspaceId: string, name: string, color = '#6b7280') =>
    sendJson<WorkspaceTag>(`/api/v1/workspaces/${workspaceId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),
  updateWorkspaceTag: (
    workspaceId: string,
    tagId: string,
    values: Partial<Pick<WorkspaceTag, 'name' | 'color'>>,
  ) =>
    sendJson<WorkspaceTag>(`/api/v1/workspaces/${workspaceId}/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    }),
  deleteWorkspaceTag: (workspaceId: string, tagId: string) =>
    sendJson<void>(`/api/v1/workspaces/${workspaceId}/tags/${tagId}`, {
      method: 'DELETE',
      body: '{}',
    }),
  listBugAttachments: (workspaceId: string, projectId: string, featureId: string) =>
    getApiJson<BugAttachment[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments`,
    }),
  uploadBugAttachment: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    payload: {
      file_name: string;
      content_type: 'image/png' | 'image/jpeg' | 'image/webp';
      data_base64: string;
    },
  ) =>
    sendJson<BugAttachment>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  deleteBugAttachment: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    attachmentId: string,
  ) =>
    sendJson<void>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments/${attachmentId}`,
      { method: 'DELETE', body: '{}' },
    ),
  createEpic: (
    workspaceId: string,
    projectId: string,
    title: string,
    description?: string,
    options?: Pick<Epic, 'priority' | 'tags'>,
  ) =>
    sendJson<Epic>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/epics`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: description || null,
        priority: options?.priority ?? 'medium',
        tags: options?.tags ?? [],
      }),
    }),
  updateEpic: (workspaceId: string, projectId: string, epicId: string, values: EpicUpdate) =>
    sendJson<Epic>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/epics/${epicId}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    }),
  createFeature: (
    workspaceId: string,
    projectId: string,
    title: string,
    epic_id?: string,
    values?: Partial<
      Pick<
        Feature,
        | 'kind'
        | 'bug_severity'
        | 'steps_to_reproduce'
        | 'expected_result'
        | 'actual_result'
        | 'tags'
        | 'notes'
      >
    >,
  ) =>
    sendJson<Feature>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/features`, {
      method: 'POST',
      body: JSON.stringify({ title, epic_id: epic_id || null, ...values }),
    }),
  updateFeature: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    values: Partial<
      Pick<
        Feature,
        | 'title'
        | 'description'
        | 'goal'
        | 'epic_id'
        | 'priority'
        | 'status'
        | 'kind'
        | 'bug_severity'
        | 'steps_to_reproduce'
        | 'expected_result'
        | 'actual_result'
        | 'tags'
        | 'notes'
      >
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
  updateCriterion: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    criterionId: string,
    values: Partial<Pick<Criterion, 'description' | 'satisfied' | 'position'>>,
  ) =>
    sendJson<Criterion>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria/${criterionId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  deleteCriterion: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    criterionId: string,
  ) =>
    sendJson<void>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria/${criterionId}`,
      { method: 'DELETE', body: '{}' },
    ),
  reorderCriteria: (workspaceId: string, projectId: string, featureId: string, ids: string[]) =>
    sendJson<Criterion[]>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/acceptance-criteria/reorder`,
      { method: 'POST', body: JSON.stringify({ ids }) },
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
