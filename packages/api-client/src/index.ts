/** A narrow same-origin HTTP boundary for the public API. */
export type ApiRequest = { path: `/api/v1/${string}`; signal?: AbortSignal };
export async function getApiJson<T>(request: ApiRequest): Promise<T> {
  const res = await fetch(request.path, { signal: request.signal, credentials: 'same-origin' });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export type Workspace = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

async function sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => undefined) as { detail?: string } | undefined;
    throw new Error(detail?.detail ?? `API HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const organizationApi = {
  listWorkspaces: () => getApiJson<Workspace[]>({ path: '/api/v1/workspaces' }),
  createWorkspace: (name: string) => sendJson<Workspace>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  listProjects: (workspaceId: string, search = '', status: 'active' | 'archived' | 'all' = 'active') =>
    getApiJson<Project[]>({ path: `/api/v1/workspaces/${workspaceId}/projects?search=${encodeURIComponent(search)}&status=${status}` as `/api/v1/${string}` }),
  createProject: (workspaceId: string, name: string, description?: string) =>
    sendJson<Project>(`/api/v1/workspaces/${workspaceId}/projects`, { method: 'POST', body: JSON.stringify({ name, description: description || null }) }),
  setProjectStatus: (workspaceId: string, projectId: string, status: 'active' | 'archived') =>
    sendJson<Project>(`/api/v1/workspaces/${workspaceId}/projects/${projectId}/${status === 'archived' ? 'archive' : 'restore'}`, { method: 'POST', body: '{}' }),
};
