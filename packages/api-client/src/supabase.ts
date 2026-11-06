import { ApiError } from './errors.js';
import { strToU8, zipSync } from 'fflate';
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
import type { SupabaseProfile } from './storage.js';
import type { ApiRequest, ApiRequestHandler } from './transport.js';
import {
  storageCleanupScope,
  storagePathForEntry,
  storageDeleteBatches,
  shouldRetryStorageCleanup,
  type StorageListEntry,
} from './supabase-storage-paths.js';
import {
  decodeBase64,
  validateImage,
  safeFileName,
  sha256,
  sha256Text,
  verifyAttachmentBlob,
} from './attachment-validation.js';
import { parsePackage } from './project-package.js';
import {
  type SessionProvider,
  type JsonRecord,
  type AttachmentRecord,
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENTS_PER_BUG,
  MAX_PACKAGE_BYTES,
  MAX_STORAGE_LIST_PAGE,
  MAX_STORAGE_CLEANUP_ATTEMPTS,
  bodyOf,
  one,
  query,
  routeParts,
  unsupported,
} from './supabase-shared.js';

export function createSupabaseHandler(
  profile: SupabaseProfile,
  getSession: SessionProvider,
): ApiRequestHandler {
  async function responseFor(
    endpoint: string,
    init: RequestInit = {},
    options: { preflight?: boolean } = {},
  ): Promise<Response> {
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
    return response;
  }

  async function request<T>(
    endpoint: string,
    init: RequestInit = {},
    options: { preflight?: boolean } = {},
  ): Promise<T> {
    const response = await responseFor(endpoint, init, options);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function blobRequest(endpoint: string, init: RequestInit = {}): Promise<Blob> {
    const response = await responseFor(endpoint, init);
    return response.blob();
  }

  async function listWorkspaceStoragePaths(workspaceId: string): Promise<string[]> {
    const workspacePrefix = storageCleanupScope(workspaceId);
    const pendingPrefixes = [workspacePrefix];
    const files: string[] = [];
    const visitedPrefixes = new Set<string>();

    while (pendingPrefixes.length > 0) {
      const prefix = pendingPrefixes.shift();
      if (!prefix || visitedPrefixes.has(prefix)) continue;
      visitedPrefixes.add(prefix);

      for (let offset = 0; ; offset += MAX_STORAGE_LIST_PAGE) {
        const entries = await request<StorageListEntry[]>(
          `/storage/v1/object/list/${ATTACHMENT_BUCKET}`,
          {
            method: 'POST',
            body: JSON.stringify({
              prefix,
              limit: MAX_STORAGE_LIST_PAGE,
              offset,
              sortBy: { column: 'name', order: 'asc' },
            }),
          },
        );
        if (!Array.isArray(entries)) {
          throw new ApiError(502, 'Supabase returned an invalid Storage listing.');
        }

        for (const entry of entries) {
          const path = storagePathForEntry(prefix, entry, workspacePrefix);
          if (entry.id !== null && typeof entry.id !== 'string') {
            throw new ApiError(502, 'Supabase returned an invalid Storage entry.');
          }
          if (entry.id === null) {
            pendingPrefixes.push(`${path}/`);
          } else {
            files.push(path);
          }
        }

        if (entries.length < MAX_STORAGE_LIST_PAGE) break;
      }
    }

    return files;
  }

  async function cleanupWorkspaceStorage(workspaceId: string): Promise<void> {
    let lastFailure: unknown;

    for (let attempt = 0; attempt < MAX_STORAGE_CLEANUP_ATTEMPTS; attempt += 1) {
      try {
        const paths = await listWorkspaceStoragePaths(workspaceId);
        if (paths.length === 0) return;

        for (const batch of storageDeleteBatches(paths)) {
          await responseFor(`/storage/v1/object/${ATTACHMENT_BUCKET}`, {
            method: 'DELETE',
            body: JSON.stringify({ prefixes: batch }),
          });
        }
        const remaining = await listWorkspaceStoragePaths(workspaceId);
        if (remaining.length === 0) return;
        lastFailure = new ApiError(409, 'Workspace Storage cleanup did not complete.');
      } catch (cause) {
        lastFailure = cause;
        if (!shouldRetryStorageCleanup(cause) || attempt === MAX_STORAGE_CLEANUP_ATTEMPTS - 1) {
          throw cause;
        }
      }
    }

    throw lastFailure instanceof Error
      ? lastFailure
      : new ApiError(409, 'Workspace Storage cleanup did not complete.');
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

  async function uploadAttachment(
    workspaceId: string,
    projectId: string,
    featureId: string,
    body: JsonRecord,
  ): Promise<BugAttachment> {
    const contentType = body.content_type;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(String(contentType))) {
      throw new ApiError(422, 'Screenshot content type is not supported.');
    }
    const bytes = decodeBase64(String(body.data_base64 ?? ''));
    validateImage(bytes, String(contentType));
    const fileName = safeFileName(String(body.file_name ?? ''));
    const existing = await table<Array<{ id: string }>>(
      'bug_attachments',
      query({ select: 'id', project_id: `eq.${projectId}`, feature_id: `eq.${featureId}` }),
    );
    if (existing.length >= MAX_ATTACHMENTS_PER_BUG) {
      throw new ApiError(422, 'A Bug can have at most five screenshots.');
    }
    const attachmentId = globalThis.crypto.randomUUID();
    const storagePath = `${workspaceId}/${projectId}/${featureId}/${attachmentId}-${fileName}`;
    const contentHash = await sha256(bytes);
    const encodedBytes = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(encodedBytes).set(bytes);
    try {
      await responseFor(`/storage/v1/object/${ATTACHMENT_BUCKET}/${storagePath}`, {
        method: 'POST',
        headers: { 'Content-Type': String(contentType), 'x-upsert': 'false' },
        body: encodedBytes,
      });
      await verifyAttachmentBlob(
        await blobRequest(`/storage/v1/object/authenticated/${ATTACHMENT_BUCKET}/${storagePath}`),
        String(contentType),
        bytes.byteLength,
        contentHash,
      );
      const created = one(
        await table<AttachmentRecord[]>('bug_attachments', '', {
          method: 'POST',
          body: JSON.stringify({
            id: attachmentId,
            workspace_id: workspaceId,
            project_id: projectId,
            feature_id: featureId,
            storage_path: storagePath,
            file_name: fileName,
            content_type: contentType,
            byte_size: bytes.byteLength,
            sha256: contentHash,
          }),
        }),
      );
      return created;
    } catch (cause) {
      await responseFor(`/storage/v1/object/${ATTACHMENT_BUCKET}/${storagePath}`, {
        method: 'DELETE',
      }).catch(() => undefined);
      throw cause;
    }
  }

  async function attachmentContent(
    workspaceId: string,
    projectId: string,
    featureId: string,
    attachmentId: string,
  ): Promise<Blob> {
    const records = await table<AttachmentRecord[]>(
      'bug_attachments',
      query({
        select: 'id,feature_id,file_name,content_type,byte_size,sha256,storage_path',
        id: `eq.${attachmentId}`,
        workspace_id: `eq.${workspaceId}`,
        project_id: `eq.${projectId}`,
        feature_id: `eq.${featureId}`,
      }),
    );
    const record = one(records);
    return verifyAttachmentBlob(
      await blobRequest(
        `/storage/v1/object/authenticated/${ATTACHMENT_BUCKET}/${record.storage_path}`,
      ),
      record.content_type,
      record.byte_size,
      record.sha256,
    );
  }

  async function packageExport(workspaceId: string, projectId: string): Promise<Blob> {
    const document = await rpc<JsonRecord>('forge_transfer_export', {
      p_workspace_id: workspaceId,
      p_project_id: projectId,
      p_schema_version: 'forge-project-transfer-v2',
    });
    const files: Record<string, Uint8Array> = { 'manifest.json': new Uint8Array() };
    const features = Array.isArray(document.features) ? (document.features as JsonRecord[]) : [];
    const featureRows = await table<Array<{ id: string; kind: string }>>(
      'features',
      query({ select: 'id,kind', project_id: `eq.${projectId}`, order: 'created_at.asc,id.asc' }),
    );
    for (const [featureIndex, feature] of features.entries()) {
      if (feature.kind !== 'bug') continue;
      const featureId = featureRows[featureIndex]?.id;
      if (!featureId)
        throw new ApiError(409, 'Project export returned an invalid Work Item reference.');
      const attachments = await table<AttachmentRecord[]>(
        'bug_attachments',
        query({
          select: 'id,file_name,content_type,byte_size,sha256,storage_path',
          feature_id: `eq.${featureId}`,
        }),
      );
      const declarations: JsonRecord[] = [];
      for (const [attachmentIndex, attachment] of attachments.entries()) {
        const bytes = new Uint8Array(
          await (
            await attachmentContent(workspaceId, projectId, featureId, attachment.id)
          ).arrayBuffer(),
        );
        const extension =
          attachment.content_type === 'image/jpeg' ? 'jpg' : attachment.content_type.split('/')[1];
        const path = `attachments/feature-${String(featureIndex + 1).padStart(3, '0')}/attachment-${String(attachmentIndex + 1).padStart(3, '0')}.${extension}`;
        files[path] = bytes;
        declarations.push({
          path,
          file_name: attachment.file_name,
          content_type: attachment.content_type,
          byte_size: bytes.byteLength,
          sha256: await sha256(bytes),
        });
      }
      feature.attachments = declarations;
    }
    files['manifest.json'] = strToU8(JSON.stringify(document));
    const archive = zipSync(files, { level: 6 });
    if (archive.byteLength > MAX_PACKAGE_BYTES)
      throw new ApiError(422, 'Project package exceeds 5 MiB.');
    return new Blob([archive], { type: 'application/zip' });
  }

  async function finalizeImportedProject(
    workspaceId: string,
    imported: JsonRecord,
  ): Promise<JsonRecord> {
    const importId = String(imported.import_id ?? '');
    const projectId = String(imported.project_id ?? '');
    if (!importId || !projectId) {
      throw new ApiError(502, 'Supabase did not return a protected import session.');
    }
    await rpc('forge_finalize_import', {
      p_workspace_id: workspaceId,
      p_import_id: importId,
      p_project_id: projectId,
    });
    return imported;
  }

  async function compensateImportedProject(
    workspaceId: string,
    imported: JsonRecord,
  ): Promise<void> {
    const importId = String(imported.import_id ?? '');
    const projectId = String(imported.project_id ?? '');
    if (!importId || !projectId) return;
    await rpc('forge_delete_imported_project', {
      p_workspace_id: workspaceId,
      p_import_id: importId,
      p_project_id: projectId,
    }).catch(() => undefined);
  }

  async function packagePreview(workspaceId: string, archiveBase64: string): Promise<JsonRecord> {
    const parsed = await parsePackage(archiveBase64);
    const preview = await rpc<JsonRecord>('forge_transfer_preview', {
      p_workspace_id: workspaceId,
      p_document: parsed.document,
    });
    const counts = (preview.counts ?? {}) as JsonRecord;
    const fingerprint = await sha256Text({
      document: parsed.document,
      attachments: parsed.assets.map(({ bytes: _bytes, ...metadata }) => metadata),
    });
    return { ...preview, fingerprint, counts: { ...counts, attachments: parsed.assets.length } };
  }

  async function packageCommit(
    workspaceId: string,
    archiveBase64: string,
    expectedFingerprint: string,
  ): Promise<JsonRecord> {
    const parsed = await parsePackage(archiveBase64);
    const packageFingerprint = await sha256Text({
      document: parsed.document,
      attachments: parsed.assets.map(({ bytes: _bytes, ...metadata }) => metadata),
    });
    if (packageFingerprint !== expectedFingerprint) {
      throw new ApiError(409, 'Import fingerprint does not match the reviewed package.');
    }
    const documentPreview = await rpc<JsonRecord>('forge_transfer_preview', {
      p_workspace_id: workspaceId,
      p_document: parsed.document,
    });
    const imported = await rpc<JsonRecord>('forge_transfer_commit', {
      p_workspace_id: workspaceId,
      p_document: parsed.document,
      p_expected_fingerprint: documentPreview.fingerprint,
    });
    const references = Array.isArray(imported.references)
      ? (imported.references as JsonRecord[])
      : [];
    const featureIds = new Map(
      references.map((reference) => [String(reference.ref), String(reference.generated_id)]),
    );
    const uploaded: string[] = [];
    try {
      for (const asset of parsed.assets) {
        const featureId = featureIds.get(asset.featureRef);
        if (!featureId) throw new ApiError(422, 'Project package references an unknown Bug.');
        const attachmentId = globalThis.crypto.randomUUID();
        const storagePath = `${workspaceId}/${imported.project_id}/${featureId}/${attachmentId}-${asset.fileName}`;
        await responseFor(`/storage/v1/object/${ATTACHMENT_BUCKET}/${storagePath}`, {
          method: 'POST',
          headers: { 'Content-Type': asset.contentType, 'x-upsert': 'false' },
          body: asset.bytes.buffer as ArrayBuffer,
        });
        uploaded.push(storagePath);
        await verifyAttachmentBlob(
          await blobRequest(`/storage/v1/object/authenticated/${ATTACHMENT_BUCKET}/${storagePath}`),
          asset.contentType,
          asset.bytes.byteLength,
          asset.sha256,
        );
        await table('bug_attachments', '', {
          method: 'POST',
          body: JSON.stringify({
            id: attachmentId,
            workspace_id: workspaceId,
            project_id: imported.project_id,
            feature_id: featureId,
            storage_path: storagePath,
            file_name: asset.fileName,
            content_type: asset.contentType,
            byte_size: asset.bytes.byteLength,
            sha256: asset.sha256,
          }),
        });
      }
      await finalizeImportedProject(workspaceId, imported);
      return imported;
    } catch (cause) {
      await Promise.all(
        uploaded.map((path) =>
          responseFor(`/storage/v1/object/${ATTACHMENT_BUCKET}/${path}`, {
            method: 'DELETE',
          }).catch(() => undefined),
        ),
      );
      await compensateImportedProject(workspaceId, imported);
      throw cause;
    }
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

  async function deleteWorkspace(workspaceId: string): Promise<void> {
    await cleanupWorkspaceStorage(workspaceId);
    await rpc<void>('forge_delete_workspace', { p_workspace_id: workspaceId });
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
