import { getApiJson, sendJson } from './transport';
import type { Observation, Repository } from './types';

export const repositoriesCapability = {
  listRepositories: (workspaceId: string, projectId: string) =>
    getApiJson<Repository[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories`,
    }),
  connectRepository: (workspaceId: string, projectId: string, root_path: string) =>
    sendJson<Repository>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories`, {
      method: 'POST',
      body: JSON.stringify({ root_path }),
    }),
  disconnectRepository: (workspaceId: string, projectId: string, repositoryId: string) =>
    sendJson<Repository>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/disconnect`,
      { method: 'POST', body: '{}' },
    ),
  listObservations: (workspaceId: string, projectId: string, repositoryId: string) =>
    getApiJson<Observation[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/observations`,
    }),
  observeRepository: (workspaceId: string, projectId: string, repositoryId: string) =>
    sendJson<Observation>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/observe`,
      { method: 'POST', body: '{}' },
    ),
};
