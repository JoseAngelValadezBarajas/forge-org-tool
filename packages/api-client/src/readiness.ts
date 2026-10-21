import { sendJson } from './transport.js';
import type { ReadinessResult } from './types.js';

export const readinessCapability = {
  previewReadiness: (workspaceId: string, projectId: string, featureId: string) =>
    sendJson<ReadinessResult>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/readiness/preview`,
      { method: 'POST', body: '{}' },
    ),
  saveReadiness: (workspaceId: string, projectId: string, featureId: string) =>
    sendJson<ReadinessResult>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/readiness/evaluations`,
      { method: 'POST', body: '{}' },
    ),
};
