import { ApiError } from './errors.js';
import type { Epic, Feature, Project, Workspace, WorkspaceTag } from './types.js';
import type { SupabaseProfile, SupabaseSession } from './storage.js';
import type { ApiRequest, ApiRequestHandler } from './transport.js';

type SessionProvider = () => Promise<SupabaseSession | null>;
type JsonRecord = Record<string, unknown>;

function bodyOf(init: RequestInit): JsonRecord {
  if (typeof init.body !== 'string' || init.body.length === 0) return {};
  return JSON.parse(init.body) as JsonRecord;
}

function one<T>(value: T | T[]): T {
  if (Array.isArray(value)) {
    if (value.length === 0) throw new ApiError(404, 'Resource not found.');
    return value[0];
  }
  return value;
}

function query(parameters: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : '';
}

function routeParts(path: string): string[] {
  return path.split('?')[0].split('/').filter(Boolean).slice(2);
}

function unsupported(): ApiError {
  return new ApiError(501, 'This capability is available only with local SQLite in BYOC 0.1.');
}

export function createSupabaseHandler(
  profile: SupabaseProfile,
  getSession: SessionProvider,
): ApiRequestHandler {
  async function request<T>(
    endpoint: string,
    init: RequestInit = {},
    options: { preflight?: boolean } = {},
  ): Promise<T> {
    const session = await getSession();
    if (!session) throw new ApiError(401, 'Sign in to the configured Supabase project.');
    let response: Response;
    try {
      response = await fetch(`${profile.projectUrl}${endpoint}`, {
        ...init,
        headers: {
          apikey: profile.publishableKey,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new ApiError(503, 'Supabase is unavailable.');
    }
    if (!response.ok) {
      if (options.preflight && response.status === 404) {
        throw new ApiError(409, 'The Supabase BYOC schema is missing or unsupported.');
      }
      const detail = (await response.json().catch(() => undefined)) as
        { message?: string } | undefined;
      if (response.status === 401)
        throw new ApiError(401, 'Supabase session expired. Sign in again.');
      if (response.status === 403) throw new ApiError(403, 'Supabase denied this operation.');
      throw new ApiError(
        response.status,
        options.preflight ? 'Supabase preflight failed.' : detail?.message,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function table<T>(tableName: string, suffix = '', init: RequestInit = {}): Promise<T> {
    return request<T>(`/rest/v1/${tableName}${suffix}`, {
      ...init,
      headers: { Prefer: 'return=representation', ...(init.headers ?? {}) },
    });
  }

  async function rpc<T>(name: string, payload: JsonRecord): Promise<T> {
    return request<T>(
      `/rest/v1/rpc/${name}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { preflight: name === 'forge_storage_preflight' },
    );
  }

  async function listWorkspaces(): Promise<Workspace[]> {
    return table<Workspace[]>('workspaces', query({ select: '*', order: 'created_at.asc' }));
  }

  async function createWorkspace(body: JsonRecord): Promise<Workspace> {
    return one(
      await rpc<Workspace | Workspace[]>('forge_create_workspace', {
        p_name: body.name,
        p_description: body.description ?? null,
      }),
    );
  }

  async function listProjects(workspaceId: string, path: string): Promise<Project[]> {
    const url = new URL(`https://forge.invalid${path}`);
    const status = url.searchParams.get('status') ?? 'active';
    const search = url.searchParams.get('search') ?? '';
    return table<Project[]>(
      'projects',
      query({
        select: '*',
        workspace_id: `eq.${workspaceId}`,
        ...(status === 'all' ? {} : { status: `eq.${status}` }),
        ...(search ? { name: `ilike.*${search.replaceAll('*', '')}*` } : {}),
        order: 'created_at.asc',
      }),
    );
  }

  async function listEpics(projectId: string): Promise<Epic[]> {
    const raw = await table<Epic[]>(
      'epics',
      query({
        select: '*',
        project_id: `eq.${projectId}`,
        order: 'created_at.asc',
      }),
    );
    const features = await table<Feature[]>(
      'features',
      query({ select: 'id,epic_id,status', project_id: `eq.${projectId}` }),
    );
    return raw.map((epic) => {
      const children = features.filter((feature) => feature.epic_id === epic.id);
      const completed = children.filter((feature) => feature.status === 'done').length;
      return {
        ...epic,
        tags: epic.tags ?? [],
        feature_count: children.length,
        completed_feature_count: completed,
        progress: children.length ? Math.round((completed / children.length) * 100) : 0,
      };
    });
  }

  async function listFeatures(projectId: string, path: string): Promise<Feature[]> {
    const url = new URL(`https://forge.invalid${path}`);
    const search = url.searchParams.get('search');
    return table<Feature[]>(
      'features',
      query({
        select: '*',
        project_id: `eq.${projectId}`,
        ...(search ? { title: `ilike.*${search.replaceAll('*', '')}*` } : {}),
        ...(url.searchParams.get('status')
          ? { status: `eq.${url.searchParams.get('status')}` }
          : {}),
        ...(url.searchParams.get('priority')
          ? { priority: `eq.${url.searchParams.get('priority')}` }
          : {}),
        ...(url.searchParams.get('epic_id')
          ? { epic_id: `eq.${url.searchParams.get('epic_id')}` }
          : {}),
        order: 'created_at.asc',
      }),
    );
  }

  async function planningOverview(workspaceId: string, projectId: string) {
    const [epics, features] = await Promise.all([
      listEpics(projectId),
      listFeatures(projectId, ''),
    ]);
    return {
      epics: epics.map((epic) => ({
        ...epic,
        features: features.filter((feature) => feature.epic_id === epic.id),
      })),
      unassigned_features: features.filter((feature) => feature.epic_id === null),
      workspace_id: workspaceId,
      project_id: projectId,
    };
  }

  async function getJson<T>(requestInfo: ApiRequest): Promise<T> {
    const parts = routeParts(requestInfo.path);
    if (parts[0] !== 'workspaces') throw unsupported();
    if (parts.length === 1) return listWorkspaces() as Promise<T>;
    const workspaceId = parts[1];
    if (parts.length === 2) {
      const result = await table<Workspace[]>(
        'workspaces',
        query({ select: '*', id: `eq.${workspaceId}` }),
      );
      return one(result) as T;
    }
    if (parts[2] === 'projects' && parts.length === 4) {
      const result = await table<Project[]>(
        'projects',
        query({ select: '*', id: `eq.${parts[3]}`, workspace_id: `eq.${workspaceId}` }),
      );
      return one(result) as T;
    }
    if (parts[2] === 'projects' && parts.length === 3) {
      return listProjects(workspaceId, requestInfo.path) as Promise<T>;
    }
    if (parts[2] === 'projects' && parts[4] === 'planning' && parts[5] === 'overview') {
      return planningOverview(workspaceId, parts[3]) as Promise<T>;
    }
    if (parts[2] === 'projects' && parts[4] === 'epics' && parts.length === 5) {
      return listEpics(parts[3]) as Promise<T>;
    }
    if (parts[2] === 'projects' && parts[4] === 'features' && parts.length === 5) {
      return listFeatures(parts[3], requestInfo.path) as Promise<T>;
    }
    if (parts[2] === 'tags' && parts.length === 3) {
      return table<WorkspaceTag[]>(
        'workspace_tags',
        query({ select: '*', workspace_id: `eq.${workspaceId}`, order: 'name.asc' }),
      ) as Promise<T>;
    }
    throw unsupported();
  }

  async function sendJson<T>(path: `/api/v1/${string}`, init: RequestInit): Promise<T> {
    const parts = routeParts(path);
    if (parts[0] !== 'workspaces') throw unsupported();
    const method = (init.method ?? 'GET').toUpperCase();
    const body = bodyOf(init);
    const workspaceId = parts[1];
    if (parts.length === 1 && method === 'POST') return createWorkspace(body) as Promise<T>;
    if (parts.length === 2 && method === 'PATCH') {
      return one(
        await table<Workspace[]>('workspaces', query({ id: `eq.${workspaceId}` }), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      ) as T;
    }
    if (parts.length === 3 && ['archive', 'restore'].includes(parts[2]) && method === 'POST') {
      return one(
        await table<Workspace[]>('workspaces', query({ id: `eq.${workspaceId}` }), {
          method: 'PATCH',
          body: JSON.stringify({
            archived_at: parts[2] === 'archive' ? new Date().toISOString() : null,
          }),
        }),
      ) as T;
    }
    if (parts[2] === 'projects' && parts.length === 3 && method === 'POST') {
      return one(
        await table<Project[]>('projects', '', {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: body.name,
            description: body.description ?? null,
            status: 'active',
          }),
        }),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'epics' &&
      parts.length === 5 &&
      method === 'POST'
    ) {
      const created = one(
        await table<Epic[]>('epics', '', {
          method: 'POST',
          body: JSON.stringify({
            project_id: parts[3],
            title: body.title,
            description: body.description ?? null,
            priority: body.priority ?? 'medium',
            tags: body.tags ?? [],
            status: 'backlog',
          }),
        }),
      );
      const refreshed = (await listEpics(parts[3])).find((epic) => epic.id === created.id);
      return (refreshed ?? created) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts.length === 5 &&
      method === 'POST'
    ) {
      return one(
        await table<Feature[]>('features', '', {
          method: 'POST',
          body: JSON.stringify({
            project_id: parts[3],
            ...body,
            epic_id: body.epic_id ?? null,
            status: body.status ?? 'backlog',
            kind: body.kind ?? 'story',
            tags: body.tags ?? [],
          }),
        }),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts.length === 6 &&
      method === 'PATCH'
    ) {
      return one(
        await table<Feature[]>(
          'features',
          query({ id: `eq.${parts[5]}`, project_id: `eq.${parts[3]}` }),
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        ),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'epics' &&
      parts.length === 6 &&
      method === 'PATCH'
    ) {
      const updated = one(
        await table<Epic[]>(
          'epics',
          query({ id: `eq.${parts[5]}`, project_id: `eq.${parts[3]}` }),
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        ),
      );
      const refreshed = (await listEpics(parts[3])).find((epic) => epic.id === updated.id);
      return (refreshed ?? updated) as T;
    }
    if (parts[2] === 'projects' && parts.length === 4 && method === 'PATCH') {
      return one(
        await table<Project[]>(
          'projects',
          query({ id: `eq.${parts[3]}`, workspace_id: `eq.${workspaceId}` }),
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        ),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts.length === 5 &&
      ['archive', 'restore'].includes(parts[4]) &&
      method === 'POST'
    ) {
      return one(
        await table<Project[]>(
          'projects',
          query({ id: `eq.${parts[3]}`, workspace_id: `eq.${workspaceId}` }),
          {
            method: 'PATCH',
            body: JSON.stringify({
              status: parts[4] === 'archive' ? 'archived' : 'active',
              archived_at: parts[4] === 'archive' ? new Date().toISOString() : null,
            }),
          },
        ),
      ) as T;
    }
    if (parts[2] === 'tags' && parts.length === 3 && method === 'POST') {
      return one(
        await table<WorkspaceTag[]>('workspace_tags', '', {
          method: 'POST',
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: body.name,
            color: body.color ?? '#6b7280',
          }),
        }),
      ) as T;
    }
    if (parts[2] === 'tags' && parts.length === 4 && method === 'PATCH') {
      return one(
        await table<WorkspaceTag[]>(
          'workspace_tags',
          query({ id: `eq.${parts[3]}`, workspace_id: `eq.${workspaceId}` }),
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        ),
      ) as T;
    }
    if (parts[2] === 'tags' && parts.length === 4 && method === 'DELETE') {
      return table<void>(
        'workspace_tags',
        query({ id: `eq.${parts[3]}`, workspace_id: `eq.${workspaceId}` }),
        { method: 'DELETE' },
      ) as Promise<T>;
    }
    throw unsupported();
  }

  return {
    getJson,
    getBlob: async () => {
      throw unsupported();
    },
    sendJson,
    preflight: async () => {
      const result = await rpc<JsonRecord>('forge_storage_preflight', {});
      const schemaVersion = result.schema_version;
      if (typeof schemaVersion !== 'string') {
        throw new ApiError(409, 'The Supabase BYOC schema is missing or unsupported.');
      }
      return { schemaVersion };
    },
  };
}
