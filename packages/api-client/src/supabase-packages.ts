/** Project package export, preview and commit (with import compensation). */

import { ApiError } from './errors.js';
import { strToU8, zipSync } from 'fflate';
import { sha256, sha256Text, verifyAttachmentBlob } from './attachment-validation.js';
import { parsePackage } from './project-package.js';
import {
  type JsonRecord,
  type AttachmentRecord,
  ATTACHMENT_BUCKET,
  MAX_PACKAGE_BYTES,
  query,
} from './supabase-shared.js';
import type { SupabaseTransport } from './supabase-transport.js';
import type { createAttachmentOps } from './supabase-attachments.js';

type AttachmentOps = ReturnType<typeof createAttachmentOps>;

export function createPackageOps({
  transport: { responseFor, blobRequest, table, rpc },
  attachmentContent,
}: {
  transport: SupabaseTransport;
  attachmentContent: AttachmentOps['attachmentContent'];
}) {
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

  return {
    packageExport,
    packagePreview,
    packageCommit,
    finalizeImportedProject,
    compensateImportedProject,
  };
}
