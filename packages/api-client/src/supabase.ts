import { ApiError } from './errors.js';
import { strFromU8, strToU8, Unzip, UnzipInflate, zipSync } from 'fflate';
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
import type { SupabaseProfile, SupabaseSession } from './storage.js';
import type { ApiRequest, ApiRequestHandler } from './transport.js';

type SessionProvider = () => Promise<SupabaseSession | null>;
type JsonRecord = Record<string, unknown>;
type AttachmentRecord = BugAttachment & { storage_path: string };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ATTACHMENT_BUCKET = 'forge-bug-attachments';
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_BUG = 5;
const MAX_PACKAGE_BYTES = 5 * 1024 * 1024;
const MAX_PACKAGE_ENTRIES = 100;
const MAX_EXPANDED_BYTES = 25 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 7 * 1024 * 1024;

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
  return new ApiError(501, 'This capability is not available in the configured Supabase schema.');
}

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

  function decodeBase64(value: string): Uint8Array {
    if (!value || value.length > Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3)) {
      throw new ApiError(422, 'Screenshot exceeds the 5 MiB limit.');
    }
    let binary: string;
    try {
      binary = atob(value);
    } catch {
      throw new ApiError(422, 'Screenshot payload is not valid base64.');
    }
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (bytes.length === 0 || bytes.length > MAX_ATTACHMENT_BYTES) {
      throw new ApiError(422, 'Screenshot must be between 1 byte and 5 MiB.');
    }
    return bytes;
  }

  function decodeBytes(value: string, limit: number, message: string): Uint8Array {
    if (!value || value.length > Math.ceil((limit * 4) / 3)) throw new ApiError(422, message);
    try {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      if (bytes.length === 0 || bytes.length > limit) throw new ApiError(422, message);
      return bytes;
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      throw new ApiError(422, message);
    }
  }

  function validateImage(bytes: Uint8Array, contentType: string): void {
    const png =
      contentType === 'image/png' &&
      bytes.length >= 24 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const jpeg = contentType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8;
    const webp =
      contentType === 'image/webp' &&
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
    if (!png && !jpeg && !webp)
      throw new ApiError(422, 'Screenshot content is not a supported image.');
  }

  function safeFileName(fileName: string): string {
    const name = fileName.replaceAll('\\', '/').split('/').pop()?.trim() ?? '';
    if (!name || name.length > 255 || name.includes('\0') || name.includes('..')) {
      throw new ApiError(422, 'Screenshot filename is invalid.');
    }
    return name;
  }

  async function sha256(bytes: Uint8Array): Promise<string> {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    return `{${Object.keys(value as JsonRecord)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as JsonRecord)[key])}`)
      .join(',')}}`;
  }

  async function sha256Text(value: unknown): Promise<string> {
    return sha256(new TextEncoder().encode(stableStringify(value)));
  }

  async function verifyAttachmentBlob(
    blob: Blob,
    contentType: string,
    expectedByteSize: number,
    expectedSha256: string,
  ): Promise<Blob> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (
      (blob.type && blob.type.toLowerCase() !== contentType.toLowerCase()) ||
      bytes.byteLength !== expectedByteSize ||
      bytes.byteLength > MAX_ATTACHMENT_BYTES
    ) {
      throw new ApiError(422, 'Stored screenshot does not match attachment metadata.');
    }
    try {
      validateImage(bytes, contentType);
    } catch {
      throw new ApiError(422, 'Stored screenshot does not match attachment metadata.');
    }
    if ((await sha256(bytes)) !== expectedSha256) {
      throw new ApiError(422, 'Stored screenshot checksum does not match attachment metadata.');
    }
    return new Blob([bytes], { type: contentType });
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

  function concatChunks(chunks: Uint8Array[], byteLength: number): Uint8Array {
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  function unzipEntriesBounded(archiveBytes: Uint8Array): Record<string, Uint8Array> {
    const entries: Record<string, Uint8Array> = {};
    const seen = new Set<string>();
    let entryCount = 0;
    let declaredExpandedBytes = 0;
    let expandedBytes = 0;
    let failure: ApiError | null = null;
    const fail = (message: string): void => {
      failure ??= new ApiError(422, message);
    };
    const unzip = new Unzip((file) => {
      if (failure) return;
      entryCount += 1;
      const normalizedName = file.name.normalize('NFC').toLowerCase();
      if (entryCount > MAX_PACKAGE_ENTRIES || seen.has(normalizedName)) {
        fail('Project package exceeds decompression budget.');
        return;
      }
      seen.add(normalizedName);
      if (
        file.originalSize !== undefined &&
        (!Number.isSafeInteger(file.originalSize) || file.originalSize > MAX_EXPANDED_BYTES)
      ) {
        fail('Project package exceeds decompression budget.');
        return;
      }
      if (file.compression !== 0 && file.compression !== 8) {
        fail('Project package contains an unsupported compression method.');
        return;
      }
      const declaredSize = file.originalSize ?? 0;
      if (declaredSize > MAX_EXPANDED_BYTES - declaredExpandedBytes) {
        fail('Project package exceeds decompression budget.');
        return;
      }
      declaredExpandedBytes += declaredSize;
      const fixed = file.originalSize === undefined ? null : new Uint8Array(declaredSize);
      const chunks: Uint8Array[] = [];
      let fileSize = 0;
      let offset = 0;
      file.ondata = (error, chunk, final) => {
        if (error) {
          fail('Project package is not a valid ZIP archive.');
          return;
        }
        if (failure) return;
        fileSize += chunk.byteLength;
        expandedBytes += chunk.byteLength;
        if (
          fileSize > MAX_EXPANDED_BYTES ||
          expandedBytes > MAX_EXPANDED_BYTES ||
          (fixed !== null && offset + chunk.byteLength > fixed.byteLength)
        ) {
          fail('Project package exceeds decompression budget.');
          file.terminate();
          return;
        }
        if (fixed !== null) {
          fixed.set(chunk, offset);
          offset += chunk.byteLength;
        } else {
          chunks.push(chunk);
        }
        if (final) {
          if (fixed !== null && offset !== fixed.byteLength) {
            fail('Project package decompression size mismatch.');
            return;
          }
          entries[file.name] = fixed ?? concatChunks(chunks, fileSize);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    try {
      unzip.push(archiveBytes, true);
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      throw new ApiError(422, 'Project package is not a valid ZIP archive.');
    }
    if (failure) throw failure;
    return entries;
  }

  type PackageAsset = {
    featureRef: string;
    path: string;
    fileName: string;
    contentType: 'image/png' | 'image/jpeg' | 'image/webp';
    bytes: Uint8Array;
    sha256: string;
  };

  async function parsePackage(
    value: string,
  ): Promise<{ document: JsonRecord; assets: PackageAsset[] }> {
    const archiveBytes = decodeBytes(
      value,
      MAX_PACKAGE_BYTES,
      'Project package is not valid base64.',
    );
    const entries = unzipEntriesBounded(archiveBytes);
    const paths = Object.keys(entries);
    if (!paths.includes('manifest.json') || paths.length > MAX_PACKAGE_ENTRIES) {
      throw new ApiError(422, 'Project package manifest is invalid.');
    }
    let manifest: JsonRecord;
    try {
      const parsedManifest: unknown = JSON.parse(strFromU8(entries['manifest.json']));
      if (!isRecord(parsedManifest)) throw new Error('manifest must be an object');
      manifest = parsedManifest;
    } catch {
      throw new ApiError(422, 'Project package manifest is invalid.');
    }
    if (
      manifest.schema_version !== 'forge-project-transfer-v2' ||
      !Array.isArray(manifest.features)
    ) {
      throw new ApiError(422, 'Project packages require the transfer v2 manifest.');
    }
    const assets: PackageAsset[] = [];
    const referenced = new Set(['manifest.json']);
    const normalizedFeatures = (manifest.features as unknown[]).map((featureValue) => {
      if (!isRecord(featureValue)) {
        throw new ApiError(422, 'Project package features must be objects.');
      }
      const feature = featureValue;
      const declarations = Array.isArray(feature.attachments) ? feature.attachments : [];
      if (
        declarations.length > MAX_ATTACHMENTS_PER_BUG ||
        (declarations.length > 0 && feature.kind !== 'bug')
      ) {
        throw new ApiError(422, 'Only Bugs may contain at most five screenshot attachments.');
      }
      declarations.forEach((declarationValue) => {
        if (!isRecord(declarationValue)) {
          throw new ApiError(422, 'Project package attachment metadata is invalid.');
        }
        const declaration = declarationValue;
        const path = String(declaration.path ?? '');
        const contentType = declaration.content_type as PackageAsset['contentType'];
        const fileName = String(declaration.file_name ?? '');
        if (
          !/^attachments\/feature-[0-9]{3}\/attachment-[0-9]{3}\.(png|jpg|jpeg|webp)$/.test(path)
        ) {
          throw new ApiError(422, 'Project package contains an unsafe attachment path.');
        }
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
          throw new ApiError(422, 'Project package contains an unsupported image type.');
        }
        if (
          !fileName ||
          fileName.length > 255 ||
          fileName.includes('/') ||
          fileName.includes('\\')
        ) {
          throw new ApiError(422, 'Project package attachment filename is invalid.');
        }
        if (referenced.has(path) || !entries[path])
          throw new ApiError(422, 'Project package attachment is missing.');
        referenced.add(path);
        const bytes = entries[path];
        if (
          bytes.byteLength !== Number(declaration.byte_size) ||
          bytes.byteLength > MAX_ATTACHMENT_BYTES
        ) {
          throw new ApiError(422, 'Project package attachment size does not match its manifest.');
        }
        validateImage(bytes, contentType);
        assets.push({
          featureRef: String(feature.ref),
          path,
          fileName,
          contentType,
          bytes,
          sha256: String(declaration.sha256),
        });
      });
      const withoutAttachments: JsonRecord = { ...feature };
      delete withoutAttachments.attachments;
      return withoutAttachments;
    });
    if (paths.some((path) => !referenced.has(path))) {
      throw new ApiError(422, 'Project package contains an unreferenced entry.');
    }
    for (const asset of assets) {
      if ((await sha256(asset.bytes)) !== asset.sha256) {
        throw new ApiError(422, 'Project package attachment checksum does not match.');
      }
    }
    const document: JsonRecord = { ...manifest, features: normalizedFeatures };
    delete document.attachments;
    if (JSON.stringify(document).length > MAX_DOCUMENT_BYTES) {
      throw new ApiError(422, 'Project package document is too large.');
    }
    return { document, assets };
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
