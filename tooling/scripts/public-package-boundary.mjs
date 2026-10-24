import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PUBLIC_PACKAGE_NAMES = [
  '@corefoundry-labs/forge-tokens',
  '@corefoundry-labs/forge-icons',
  '@corefoundry-labs/forge-ui',
];
export const LOCAL_PACKAGE_NAMES = ['@forge-org/api-client'];

export function readPackageManifest(root, packageName) {
  const manifestPath = packageName.startsWith('@forge-org/')
    ? resolve(root, `packages/${packageName.slice('@forge-org/'.length)}/package.json`)
    : resolve(root, 'node_modules', packageName, 'package.json');
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function checkPublicPackageBoundary(rootPackage, manifests) {
  const issues = [];
  const workspaces = rootPackage.workspaces ?? [];
  if (JSON.stringify(workspaces) !== JSON.stringify(['apps/web', 'packages/api-client'])) {
    issues.push('root workspaces must contain only apps/web and packages/api-client');
  }
  for (const packageName of PUBLIC_PACKAGE_NAMES) {
    const manifest = manifests[packageName];
    if (!manifest || manifest.private === true) issues.push(`${packageName} must be publishable`);
  }
  const apiClient = manifests['@forge-org/api-client'];
  if (!apiClient || apiClient.private !== true)
    issues.push('@forge-org/api-client must remain private and local');
  return issues;
}

export function assertPublicPackageBoundary(rootPackage, manifests) {
  const issues = checkPublicPackageBoundary(rootPackage, manifests);
  if (issues.length > 0) throw new Error(issues.join('; '));
}
