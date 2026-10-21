import { organizationCapability } from './organization';
import { planningCapability } from './planning';
import { readinessCapability } from './readiness';
import { repositoriesCapability } from './repositories';
import { contextCapability } from './context';
import { transferCapability } from './transfer';
import { workbenchCapability } from './workbench';
import { deliveryCapability } from './delivery';

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

export type * from './types';
