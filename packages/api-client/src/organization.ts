import { getApiJson, sendJson } from './transport';
import type { Project, Workspace } from './types';

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
  setProjectStatus: (workspaceId: string, projectId: string, status: 'active' | 'archived') =>
    sendJson<Project>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/${status === 'archived' ? 'archive' : 'restore'}`,
      { method: 'POST', body: '{}' },
    ),
};
