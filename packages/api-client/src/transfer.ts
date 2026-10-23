import { getApiBlob, getApiJson, sendJson } from './transport.js';
import type { ContextualTransferScope, ProjectTransferPreview } from './types.js';

export const transferCapability = {
  previewProjectImport: (workspaceId: string, document: unknown) =>
    sendJson<ProjectTransferPreview>(`/api/v1/workspaces/${workspaceId}/projects/import/preview`, {
      method: 'POST',
      body: JSON.stringify(document),
    }),
  importProject: (workspaceId: string, document: unknown, expected_fingerprint: string) =>
    sendJson<{ project_id: string; fingerprint: string }>(
      `/api/v1/workspaces/${workspaceId}/projects/import`,
      { method: 'POST', body: JSON.stringify({ document, expected_fingerprint }) },
    ),
  exportProject: (
    workspaceId: string,
    projectId: string,
    schemaVersion:
      'forge-project-import-v1' | 'forge-project-transfer-v2' = 'forge-project-import-v1',
  ) =>
    getApiJson<unknown>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/export?schema_version=${schemaVersion}`,
    }),
  previewContextualImport: (
    workspaceId: string,
    projectId: string,
    scope: ContextualTransferScope,
    destinationId: string,
    document: unknown,
  ) =>
    sendJson<ProjectTransferPreview>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/transfer/${scope}/${destinationId}/preview`,
      { method: 'POST', body: JSON.stringify(document) },
    ),
  importContextual: (
    workspaceId: string,
    projectId: string,
    scope: ContextualTransferScope,
    destinationId: string,
    document: unknown,
    expected_fingerprint: string,
  ) =>
    sendJson<{ project_id: string; fingerprint: string }>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/transfer/${scope}/${destinationId}`,
      { method: 'POST', body: JSON.stringify({ document, expected_fingerprint }) },
    ),
  exportContextual: (
    workspaceId: string,
    projectId: string,
    scope: ContextualTransferScope,
    destinationId: string,
  ) =>
    getApiJson<unknown>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/transfer/${scope}/${destinationId}/export`,
    }),
  previewProjectPackageImport: (workspaceId: string, archive_base64: string) =>
    sendJson<ProjectTransferPreview>(
      `/api/v1/workspaces/${workspaceId}/projects/import/package/preview`,
      { method: 'POST', body: JSON.stringify({ archive_base64 }) },
    ),
  importProjectPackage: (
    workspaceId: string,
    archive_base64: string,
    expected_fingerprint: string,
  ) =>
    sendJson<{ project_id: string; fingerprint: string }>(
      `/api/v1/workspaces/${workspaceId}/projects/import/package`,
      { method: 'POST', body: JSON.stringify({ archive_base64, expected_fingerprint }) },
    ),
  exportProjectPackage: (workspaceId: string, projectId: string) =>
    getApiBlob({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/export/package`,
    }),
};
