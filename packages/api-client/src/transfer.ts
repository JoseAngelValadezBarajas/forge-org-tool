import { getApiJson, sendJson } from './transport';
import type { ProjectTransferPreview } from './types';

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
  exportProject: (workspaceId: string, projectId: string) =>
    getApiJson<unknown>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/export`,
    }),
};
