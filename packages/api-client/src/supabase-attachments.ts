/** Attachment upload/download and workspace Storage cleanup. */

import { ApiError } from './errors.js';
import type { BugAttachment } from './types.js';
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
  verifyAttachmentBlob,
} from './attachment-validation.js';
import {
  type JsonRecord,
  type AttachmentRecord,
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENTS_PER_BUG,
  MAX_STORAGE_LIST_PAGE,
  MAX_STORAGE_CLEANUP_ATTEMPTS,
  one,
  query,
} from './supabase-shared.js';
import type { SupabaseTransport } from './supabase-transport.js';

export function createAttachmentOps({
  responseFor,
  request,
  blobRequest,
  table,
}: SupabaseTransport) {
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

  return { cleanupWorkspaceStorage, uploadAttachment, attachmentContent };
}
