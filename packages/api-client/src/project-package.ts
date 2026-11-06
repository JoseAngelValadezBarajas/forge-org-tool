import { ApiError } from './errors.js';
import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import type { JsonRecord } from './supabase-shared.js';
import {
  MAX_PACKAGE_ENTRIES,
  MAX_EXPANDED_BYTES,
  MAX_PACKAGE_BYTES,
  isRecord,
  MAX_ATTACHMENTS_PER_BUG,
  MAX_ATTACHMENT_BYTES,
  MAX_DOCUMENT_BYTES,
} from './supabase-shared.js';
import { decodeBytes, validateImage, sha256 } from './attachment-validation.js';

export function concatChunks(chunks: Uint8Array[], byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function unzipEntriesBounded(archiveBytes: Uint8Array): Record<string, Uint8Array> {
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

export async function parsePackage(
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
      if (!/^attachments\/feature-[0-9]{3}\/attachment-[0-9]{3}\.(png|jpg|jpeg|webp)$/.test(path)) {
        throw new ApiError(422, 'Project package contains an unsafe attachment path.');
      }
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
        throw new ApiError(422, 'Project package contains an unsupported image type.');
      }
      if (!fileName || fileName.length > 255 || fileName.includes('/') || fileName.includes('\\')) {
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

export type PackageAsset = {
  featureRef: string;
  path: string;
  fileName: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  bytes: Uint8Array;
  sha256: string;
};
