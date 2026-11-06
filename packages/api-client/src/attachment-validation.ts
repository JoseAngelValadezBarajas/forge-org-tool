import { ApiError } from './errors.js';
import { detectImageType } from './images.js';
import type { JsonRecord } from './supabase-shared.js';
import { MAX_ATTACHMENT_BYTES } from './supabase-shared.js';

export function decodeBase64(value: string): Uint8Array {
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

export function decodeBytes(value: string, limit: number, message: string): Uint8Array {
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

export function validateImage(bytes: Uint8Array, contentType: string): void {
  if (detectImageType(bytes) !== contentType) {
    throw new ApiError(422, 'Screenshot content is not a supported image.');
  }
}

export function safeFileName(fileName: string): string {
  const name = fileName.replaceAll('\\', '/').split('/').pop()?.trim() ?? '';
  if (!name || name.length > 255 || name.includes('\0') || name.includes('..')) {
    throw new ApiError(422, 'Screenshot filename is invalid.');
  }
  return name;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value as JsonRecord)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as JsonRecord)[key])}`)
    .join(',')}}`;
}

export async function sha256Text(value: unknown): Promise<string> {
  return sha256(new TextEncoder().encode(stableStringify(value)));
}

export async function verifyAttachmentBlob(
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
