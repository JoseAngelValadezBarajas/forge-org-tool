import { cleanupRunEnvironment } from '../../../tooling/scripts/e2e-environment.mjs';
import { join } from 'node:path';

export default async function globalTeardown() {
  const root = process.env.FORGE_E2E_RUN_ROOT;
  if (!root) throw new Error('Playwright did not provide an isolated acceptance run directory.');
  cleanupRunEnvironment({
    root,
    fixtureDirectory: process.env.FORGE_E2E_FIXTURE_DIRECTORY,
    repositoryRoot: process.env.FORGE_E2E_REPOSITORY_ROOT,
    databasePath: process.env.FORGE_E2E_DATABASE_PATH,
    markerPath: join(root, '.forge-product-acceptance-owner'),
  });
}
