import { organizationCapability } from './organization.js';
import { planningCapability } from './planning.js';
import { readinessCapability } from './readiness.js';
import { repositoriesCapability } from './repositories.js';
import { contextCapability } from './context.js';
import { transferCapability } from './transfer.js';
import { workbenchCapability } from './workbench.js';
import { deliveryCapability } from './delivery.js';

/**
 * Compatibility composition for callers that used the pre-modular API client.
 * New capability code belongs in the focused modules imported above.
 */
export const legacyCapabilities = {
  ...organizationCapability,
  ...planningCapability,
  ...readinessCapability,
  ...repositoriesCapability,
  ...contextCapability,
  ...transferCapability,
  ...workbenchCapability,
  ...deliveryCapability,
};

export type * from './types.js';
