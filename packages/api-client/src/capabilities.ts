import { organizationCapability } from './organization.js';
import { planningCapability } from './planning.js';
import { transferCapability } from './transfer.js';

/**
 * Compatibility composition for callers that used the pre-modular API client.
 * New capability code belongs in the focused modules imported above.
 */
export const legacyCapabilities = {
  ...organizationCapability,
  ...planningCapability,
  ...transferCapability,
};

export type * from './types.js';
