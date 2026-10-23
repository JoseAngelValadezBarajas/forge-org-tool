import { getApiJson, sendJson } from './transport.js';
import type { ProjectTransferPreview } from './types.js';

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
};
