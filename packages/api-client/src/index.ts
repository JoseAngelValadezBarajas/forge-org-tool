import { organizationCapability } from './organization.js';
import { legacyCapabilities } from './capabilities.js';
import { createSupabaseHandler } from './supabase.js';
import { initializeStoredStorage, registerSupabaseHandlerFactory } from './storage.js';

export { ApiError } from './errors.js';
export { getApiBlob, getApiJson, sendJson } from './transport.js';
export type { ApiRequest } from './transport.js';
export {
  configureStorage,
  getConfiguredStorageProviders,
  getStorageSnapshot,
  inspectStorage,
  setLocalStorageAvailable,
  signInSupabase,
  signOutSupabase,
  switchStorageProvider,
  validateSupabaseProfile,
} from './storage.js';
export type {
  StorageProvider,
  StorageConfig,
  StorageSnapshot,
  StorageStatus,
  SupabaseProfile,
  SupabaseSession,
} from './storage.js';
export type * from './types.js';

registerSupabaseHandlerFactory(createSupabaseHandler);
initializeStoredStorage();

/** Stable public facade retained while capability modules are extracted incrementally. */
export const organizationApi = {
  ...legacyCapabilities,
  ...organizationCapability,
};
