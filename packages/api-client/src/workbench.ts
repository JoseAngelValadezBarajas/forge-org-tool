import { getApiJson, sendJson } from './transport.js';
import type { Handoff, HandoffRevision, Run, RunEvent, RunEventCreate } from './types.js';

export const workbenchCapability = {
  listRuns: (workspaceId: string, projectId: string, status = '', search = '') =>
    getApiJson<Run[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}` as `/api/v1/${string}`,
    }),
  getRun: (workspaceId: string, projectId: string, runId: string) =>
    getApiJson<Run>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs/${runId}`,
    }),
  listRunEvents: (workspaceId: string, projectId: string, runId: string) =>
    getApiJson<RunEvent[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs/${runId}/events`,
    }),
  createRunEvent: (workspaceId: string, projectId: string, runId: string, values: RunEventCreate) =>
    sendJson<RunEvent>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs/${runId}/events`,
      { method: 'POST', body: JSON.stringify(values) },
    ),
  createRun: (workspaceId: string, projectId: string, title: string, feature_id?: string) =>
    sendJson<Run>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ title, feature_id, execution_mode: 'manual', executor_type: 'human' }),
    }),
  listHandoffs: (workspaceId: string, projectId: string) =>
    getApiJson<Handoff[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs`,
    }),
  listHandoffRevisions: (workspaceId: string, projectId: string, handoffId: string) =>
    getApiJson<HandoffRevision[]>({
      path: `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/revisions`,
    }),
  createHandoff: (workspaceId: string, projectId: string, runId: string, title: string) =>
    sendJson<Handoff>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/runs/${runId}/handoffs`,
      { method: 'POST', body: JSON.stringify({ title }) },
    ),
  updateHandoff: (
    workspaceId: string,
    projectId: string,
    handoffId: string,
    values: { expected_version: number; title?: string; summary?: string; next_actions?: string },
  ) =>
    sendJson<Handoff>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}`,
      { method: 'PATCH', body: JSON.stringify(values) },
    ),
  readyHandoff: (
    workspaceId: string,
    projectId: string,
    handoffId: string,
    expected_version: number,
  ) =>
    sendJson<Handoff>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/ready`,
      { method: 'POST', body: JSON.stringify({ expected_version }) },
    ),
  acknowledgeHandoff: (
    workspaceId: string,
    projectId: string,
    handoffId: string,
    expected_revision: number,
    acknowledged_by: string,
  ) =>
    sendJson<{ id: string; handoff_id: string; revision: number; acknowledged_by: string }>(
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/handoffs/${handoffId}/acknowledge`,
      { method: 'POST', body: JSON.stringify({ expected_revision, acknowledged_by }) },
    ),
};
