import { organizationCapability } from './organization';
import { legacyCapabilities } from './capabilities';

export { ApiError } from './errors';
export { getApiJson, sendJson } from './transport';
export type { ApiRequest } from './transport';
export type * from './types';

/** Stable public facade retained while capability modules are extracted incrementally. */
export const organizationApi = {
  ...legacyCapabilities,
  ...organizationCapability,
};
