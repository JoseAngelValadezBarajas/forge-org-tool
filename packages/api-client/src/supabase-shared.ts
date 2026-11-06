import { type SupabaseSession } from './storage.js';
import { type BugAttachment } from './types.js';
import { TRANSFER_LIMITS } from './limits.js';
import { ApiError } from './errors.js';

export type SessionProvider = () => Promise<SupabaseSession | null>;

export type JsonRecord = Record<string, unknown>;

export type AttachmentRecord = BugAttachment & { storage_path: string };

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const ATTACHMENT_BUCKET = 'forge-bug-attachments';

export const MAX_ATTACHMENT_BYTES = TRANSFER_LIMITS.max_attachment_bytes;

export const MAX_ATTACHMENTS_PER_BUG = TRANSFER_LIMITS.max_attachments_per_bug;

export const MAX_PACKAGE_BYTES = TRANSFER_LIMITS.max_package_bytes;

export const MAX_PACKAGE_ENTRIES = TRANSFER_LIMITS.max_package_entries;

export const MAX_EXPANDED_BYTES = TRANSFER_LIMITS.max_expanded_bytes;

export const MAX_DOCUMENT_BYTES = TRANSFER_LIMITS.max_document_bytes;

export const MAX_STORAGE_LIST_PAGE = 1000;

export const MAX_STORAGE_DELETE_BATCH = 1000;

export const MAX_STORAGE_CLEANUP_ATTEMPTS = 3;

export function bodyOf(init: RequestInit): JsonRecord {
  if (typeof init.body !== 'string' || init.body.length === 0) return {};
  return JSON.parse(init.body) as JsonRecord;
}

export function one<T>(value: T | T[]): T {
  if (Array.isArray(value)) {
    if (value.length === 0) throw new ApiError(404, 'Resource not found.');
    return value[0];
  }
  return value;
}

export function query(parameters: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : '';
}

export function routeParts(path: string): string[] {
  return path.split('?')[0].split('/').filter(Boolean).slice(2);
}

export function unsupported(): ApiError {
  return new ApiError(501, 'This capability is not available in the configured Supabase schema.');
}
