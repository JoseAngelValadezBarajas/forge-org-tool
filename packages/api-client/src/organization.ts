import { getApiJson, sendJson } from './transport.js';
import type { Project, ProjectUpdate, Workspace } from './types.js';

export const organizationCapability = {
  listWorkspaces: () => getApiJson<Workspace[]>({ path: '/api/v1/workspaces' }),
  createWorkspace: (name: string) =>
    sendJson<Workspace>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  listProjects: (
    workspaceId: string,
    search = '',
    status: 'active' | 'archived' | 'all' = 'active',
  ) =>
    getApiJson<Project[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects?search=${encodeURIComponent(search)}&status=${status}` as `/api/v1/${string}`,
    }),
  createProject: (workspaceId: string, name: string, description?: string) =>
    sendJson<Project>(`/api/v1/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, description: description || null }),
    }),
  getProject: (workspaceId: string, projectId: string) =>
    getApiJson<Project>({ path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}` }),
  updateProject: (workspaceId: string, projectId: string, values: ProjectUpdate) =>
    sendJson<Project>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    }),
  setProjectStatus: (workspaceId: string, projectId: string, status: 'active' | 'archived') =>
    sendJson<Project>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/${status === 'archived' ? 'archive' : 'restore'}`,
      { method: 'POST', body: '{}' },
    ),
};
