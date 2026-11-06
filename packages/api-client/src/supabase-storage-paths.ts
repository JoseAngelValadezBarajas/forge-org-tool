import { ApiError } from './errors.js';
import { MAX_STORAGE_DELETE_BATCH } from './supabase-shared.js';

export function storageCleanupScope(workspaceId: string): string {
  if (
    workspaceId.length === 0 ||
    workspaceId === '.' ||
    workspaceId === '..' ||
    workspaceId.includes('/') ||
    workspaceId.includes('\\')
  ) {
    throw new ApiError(422, 'Workspace storage scope is invalid.');
  }
  return `${workspaceId}/`;
}

export function storagePathForEntry(
  prefix: string,
  entry: StorageListEntry,
  workspacePrefix: string,
): string {
  if (typeof entry.name !== 'string' || entry.name.length === 0) {
    throw new ApiError(502, 'Supabase returned an invalid Storage entry.');
  }
  if (
    entry.name === '.' ||
    entry.name === '..' ||
    entry.name.includes('/') ||
    entry.name.includes('\\')
  ) {
    throw new ApiError(502, 'Supabase returned a Storage entry outside the workspace scope.');
  }
  const path = `${prefix}${entry.name}`;
  if (
    !path.startsWith(workspacePrefix) ||
    path.split('/').some((part) => part === '.' || part === '..')
  ) {
    throw new ApiError(502, 'Supabase returned a Storage entry outside the workspace scope.');
  }
  return path;
}

export function storageDeleteBatches(paths: string[]): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < paths.length; index += MAX_STORAGE_DELETE_BATCH) {
    batches.push(paths.slice(index, index + MAX_STORAGE_DELETE_BATCH));
  }
  return batches;
}

export function shouldRetryStorageCleanup(cause: unknown): boolean {
  return (
    cause instanceof ApiError &&
    (cause.status === 408 || cause.status === 429 || cause.status >= 500)
  );
}

export type StorageListEntry = {
  name?: unknown;
  id?: unknown;
};
