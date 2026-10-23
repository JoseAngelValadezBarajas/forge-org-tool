import { organizationCapability } from './organization.js';
import { legacyCapabilities } from './capabilities.js';

export { ApiError } from './errors.js';
export { getApiJson, sendJson } from './transport.js';
export type { ApiRequest } from './transport.js';
export type * from './types.js';

/** Stable public facade retained while capability modules are extracted incrementally. */
export const organizationApi = {
  ...legacyCapabilities,
  ...organizationCapability,
};
