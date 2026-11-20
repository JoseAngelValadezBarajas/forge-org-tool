import { ApiError } from './errors.js';
import type {
  BugAttachment,
  Criterion,
  Dependency,
  Epic,
  Feature,
  Project,
  Task,
  Workspace,
  WorkspaceTag,
} from './types.js';
import type { ApiRequest } from './transport.js';
import type { SupabaseProfile } from './storage.js';
import type { ApiRequestHandler } from './transport.js';
import {
  type SessionProvider,
  type JsonRecord,
  type AttachmentRecord,
  ATTACHMENT_BUCKET,
  bodyOf,
  one,
  query,
  routeParts,
  unsupported,
} from './supabase-shared.js';
import { createAttachmentOps } from './supabase-attachments.js';
import { createPackageOps } from './supabase-packages.js';
import { createPlanningOps } from './supabase-planning.js';
import { createSupabaseTransport } from './supabase-transport.js';

export function createSupabaseHandler(
  profile: SupabaseProfile,
  getSession: SessionProvider,
): ApiRequestHandler {
  const transport = createSupabaseTransport(profile, getSession);
  const { responseFor, table, rpc } = transport;
  const { cleanupWorkspaceStorage, uploadAttachment, attachmentContent } =
    createAttachmentOps(transport);
  const {
    packageExport,
    packagePreview,
    packageCommit,
    finalizeImportedProject,
    compensateImportedProject,
  } = createPackageOps({ transport, attachmentContent });
  const {
    listWorkspaces,
    createWorkspace,
    deleteWorkspace,
    listProjects,
    listEpics,
    listFeatures,
    planningOverview,
  } = createPlanningOps({ transport, cleanupWorkspaceStorage });

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
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'acceptance-criteria' &&
      parts.length === 7
    ) {
      return table<Criterion[]>(
        'acceptance_criteria',
        query({ select: '*', feature_id: `eq.${parts[5]}`, order: 'position.asc,id.asc' }),
      ) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'tasks' &&
      parts.length === 7
    ) {
      return table<Task[]>(
        'tasks',
        query({ select: '*', feature_id: `eq.${parts[5]}`, order: 'position.asc,id.asc' }),
      ) as Promise<T>;
    }
    if (parts[2] === 'projects' && parts[4] === 'dependencies' && parts.length === 5) {
      return table<Dependency[]>(
        'feature_dependencies',
        query({ select: '*', project_id: `eq.${parts[3]}`, order: 'created_at.asc,id.asc' }),
      ) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'attachments' &&
      parts.length === 7
    ) {
      return table<BugAttachment[]>(
        'bug_attachments',
        query({
          select: 'id,feature_id,file_name,content_type,byte_size,sha256,created_at',
          project_id: `eq.${parts[3]}`,
          feature_id: `eq.${parts[5]}`,
          order: 'created_at.asc,id.asc',
        }),
      ) as Promise<T>;
    }
    if (parts[2] === 'projects' && parts[4] === 'export' && parts.length === 5) {
      const url = new URL(`https://forge.invalid${requestInfo.path}`);
      return rpc<JsonRecord>('forge_transfer_export', {
        p_workspace_id: workspaceId,
        p_project_id: parts[3],
        p_schema_version: url.searchParams.get('schema_version') ?? 'forge-project-import-v1',
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'transfer' &&
      parts.length === 8 &&
      parts[7] === 'export'
    ) {
      return rpc<JsonRecord>('forge_transfer_contextual_export', {
        p_workspace_id: workspaceId,
        p_project_id: parts[3],
        p_scope: parts[5],
        p_destination_id: parts[6],
      }) as Promise<T>;
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
    if (
      parts[2] === 'projects' &&
      parts[3] === 'import' &&
      parts[4] === 'preview' &&
      method === 'POST'
    ) {
      return rpc<JsonRecord>('forge_transfer_preview', {
        p_workspace_id: workspaceId,
        p_document: body,
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[3] === 'import' &&
      parts.length === 4 &&
      method === 'POST'
    ) {
      const imported = await rpc<JsonRecord>('forge_transfer_commit', {
        p_workspace_id: workspaceId,
        p_document: body.document,
        p_expected_fingerprint: body.expected_fingerprint,
      });
      try {
        return (await finalizeImportedProject(workspaceId, imported)) as T;
      } catch (cause) {
        await compensateImportedProject(workspaceId, imported);
        throw cause;
      }
    }
    if (
      parts[2] === 'projects' &&
      parts[3] === 'import' &&
      parts[4] === 'package' &&
      parts[5] === 'preview' &&
      method === 'POST'
    ) {
      return packagePreview(workspaceId, String(body.archive_base64 ?? '')) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[3] === 'import' &&
      parts[4] === 'package' &&
      parts.length === 5 &&
      method === 'POST'
    ) {
      return packageCommit(
        workspaceId,
        String(body.archive_base64 ?? ''),
        String(body.expected_fingerprint ?? ''),
      ) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'transfer' &&
      parts.length === 8 &&
      parts[7] === 'preview' &&
      method === 'POST'
    ) {
      return rpc<JsonRecord>('forge_transfer_contextual_preview', {
        p_workspace_id: workspaceId,
        p_project_id: parts[3],
        p_scope: parts[5],
        p_destination_id: parts[6],
        p_document: body,
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'transfer' &&
      parts.length === 7 &&
      method === 'POST'
    ) {
      return rpc<JsonRecord>('forge_transfer_contextual_commit', {
        p_workspace_id: workspaceId,
        p_project_id: parts[3],
        p_scope: parts[5],
        p_destination_id: parts[6],
        p_document: body.document,
        p_expected_fingerprint: body.expected_fingerprint,
      }) as Promise<T>;
    }
    if (parts.length === 1 && method === 'POST') return createWorkspace(body) as Promise<T>;
    if (parts.length === 2 && method === 'DELETE') {
      return deleteWorkspace(workspaceId) as Promise<T>;
    }
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
      parts[6] === 'acceptance-criteria' &&
      parts.length === 7 &&
      method === 'POST'
    ) {
      return one(
        await table<Criterion[]>('acceptance_criteria', '', {
          method: 'POST',
          body: JSON.stringify({ feature_id: parts[5], ...body, position: body.position ?? 0 }),
        }),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'acceptance-criteria' &&
      parts.length === 8 &&
      method === 'PATCH'
    ) {
      return one(
        await table<Criterion[]>(
          'acceptance_criteria',
          query({ id: `eq.${parts[7]}`, feature_id: `eq.${parts[5]}` }),
          { method: 'PATCH', body: JSON.stringify(body) },
        ),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'acceptance-criteria' &&
      parts.length === 8 &&
      method === 'DELETE'
    ) {
      return table<void>(
        'acceptance_criteria',
        query({ id: `eq.${parts[7]}`, feature_id: `eq.${parts[5]}` }),
        { method: 'DELETE' },
      ) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'acceptance-criteria' &&
      parts[7] === 'reorder' &&
      parts.length === 8 &&
      method === 'POST'
    ) {
      return rpc<Criterion[]>('forge_reorder_criteria', {
        p_feature_id: parts[5],
        p_ids: body.ids,
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'tasks' &&
      parts.length === 7 &&
      method === 'POST'
    ) {
      return one(
        await table<Task[]>('tasks', '', {
          method: 'POST',
          body: JSON.stringify({
            feature_id: parts[5],
            ...body,
            position: body.position ?? 0,
            status: body.status ?? 'todo',
          }),
        }),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'tasks' &&
      parts.length === 8 &&
      method === 'PATCH'
    ) {
      return one(
        await table<Task[]>(
          'tasks',
          query({ id: `eq.${parts[7]}`, feature_id: `eq.${parts[5]}` }),
          { method: 'PATCH', body: JSON.stringify(body) },
        ),
      ) as T;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'tasks' &&
      parts.length === 8 &&
      method === 'DELETE'
    ) {
      return table<void>('tasks', query({ id: `eq.${parts[7]}`, feature_id: `eq.${parts[5]}` }), {
        method: 'DELETE',
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'tasks' &&
      parts[7] === 'reorder' &&
      parts.length === 8 &&
      method === 'POST'
    ) {
      return rpc<Task[]>('forge_reorder_tasks', {
        p_feature_id: parts[5],
        p_ids: body.ids,
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'dependencies' &&
      parts.length === 5 &&
      method === 'POST'
    ) {
      return rpc<Dependency>('forge_create_dependency', {
        p_project_id: parts[3],
        p_blocking_feature_id: body.blocking_feature_id,
        p_blocked_feature_id: body.blocked_feature_id,
      }) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'dependencies' &&
      parts.length === 6 &&
      method === 'DELETE'
    ) {
      return table<void>(
        'feature_dependencies',
        query({ id: `eq.${parts[5]}`, project_id: `eq.${parts[3]}` }),
        { method: 'DELETE' },
      ) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'attachments' &&
      parts.length === 7 &&
      method === 'POST'
    ) {
      return uploadAttachment(workspaceId, parts[3], parts[5], body) as Promise<T>;
    }
    if (
      parts[2] === 'projects' &&
      parts[4] === 'features' &&
      parts[6] === 'attachments' &&
      parts.length === 8 &&
      method === 'DELETE'
    ) {
      const records = await table<AttachmentRecord[]>(
        'bug_attachments',
        query({
          select: 'id,feature_id,file_name,content_type,byte_size,sha256,storage_path',
          id: `eq.${parts[7]}`,
          workspace_id: `eq.${workspaceId}`,
          project_id: `eq.${parts[3]}`,
          feature_id: `eq.${parts[5]}`,
        }),
      );
      const record = one(records);
      await responseFor(`/storage/v1/object/${ATTACHMENT_BUCKET}/${record.storage_path}`, {
        method: 'DELETE',
      });
      return table<void>(
        'bug_attachments',
        query({ id: `eq.${parts[7]}`, feature_id: `eq.${parts[5]}` }),
        { method: 'DELETE' },
      ) as Promise<T>;
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
    getBlob: async (requestInfo) => {
      const parts = routeParts(requestInfo.path);
      if (
        parts[0] === 'workspaces' &&
        parts[2] === 'projects' &&
        parts[4] === 'export' &&
        parts[5] === 'package'
      ) {
        return packageExport(parts[1], parts[3]);
      }
      if (
        parts[0] === 'workspaces' &&
        parts[2] === 'projects' &&
        parts[4] === 'features' &&
        parts[6] === 'attachments' &&
        parts[8] === 'content'
      ) {
        return attachmentContent(parts[1], parts[3], parts[5], parts[7]);
      }
      throw unsupported();
    },
    sendJson,
    preflight: async () => {
      const result = await rpc<JsonRecord>('forge_storage_preflight', {});
      const schemaVersion = result.schema_version;
      if (typeof schemaVersion !== 'string' || !schemaVersion.startsWith('forge-byoc-v')) {
        throw new ApiError(409, 'The Supabase BYOC schema is missing or unsupported.');
      }
      return { schemaVersion };
    },
  };
}
