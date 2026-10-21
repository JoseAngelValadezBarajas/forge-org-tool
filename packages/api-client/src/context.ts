import { getApiJson, sendJson } from './transport.js';
import type { ContextPackage, FeatureRepositoryLink, Repository } from './types.js';

export const contextCapability = {
  listFeatureRepositories: (workspaceId: string, projectId: string, featureId: string) =>
    getApiJson<Repository[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/repositories`,
    }),
  linkFeatureRepository: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    repositoryId: string,
  ) =>
    sendJson<FeatureRepositoryLink>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/repositories`,
      { method: 'POST', body: JSON.stringify({ repository_id: repositoryId }) },
    ),
  unlinkFeatureRepository: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    repositoryId: string,
  ) =>
    sendJson<void>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/repositories/${repositoryId}`,
      { method: 'DELETE', body: '{}' },
    ),
  previewContext: (workspaceId: string, projectId: string, featureId: string) =>
    sendJson<{ schema_version: string; fingerprint: string; payload: unknown; markdown: string }>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/preview`,
      { method: 'POST', body: '{}' },
    ),
  saveContext: (workspaceId: string, projectId: string, featureId: string) =>
    sendJson<ContextPackage>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages`,
      { method: 'POST', body: '{}' },
    ),
  listContextPackages: (workspaceId: string, projectId: string, featureId: string) =>
    getApiJson<ContextPackage[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages`,
    }),
  getContextPackage: (
    workspaceId: string,
    projectId: string,
    featureId: string,
    packageId: string,
  ) =>
    getApiJson<ContextPackage>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages/${packageId}`,
    }),
};
