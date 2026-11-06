import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readCargoPackageVersion(filePath, packageName) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const packageBlock = contents.match(
    new RegExp(`\\[\\[package\\]\\]\\nname = "${packageName}"\\nversion = "([^"]+)"`),
  );
  if (!packageBlock) {
    throw new Error(`Could not find package ${packageName} in ${filePath}`);
  }
  return packageBlock[1];
}

function readCargoManifestVersion(filePath, packageName) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const packageBlock = contents.match(
    new RegExp(`\\[package\\][\\s\\S]*?name = "${packageName}"[\\s\\S]*?version = "([^"]+)"`),
  );
  if (!packageBlock) {
    throw new Error(`Could not find package ${packageName} in ${filePath}`);
  }
  return packageBlock[1];
}

export function readReleaseMetadata(rootDir) {
  const packageJson = readJson(path.join(rootDir, 'package.json'));
  const packageLock = readJson(path.join(rootDir, 'package-lock.json'));
  const tauriConfig = readJson(path.join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json'));
  const cargoManifestPath = path.join(rootDir, 'apps/desktop/src-tauri/Cargo.toml');

  return {
    packageVersion: packageJson.version,
    packageLockVersion: packageLock.packages?.['']?.version,
    tauriVersion: tauriConfig.version,
    cargoVersion: readCargoManifestVersion(cargoManifestPath, 'forge-org-desktop'),
    cargoLockVersion: readCargoPackageVersion(
      path.join(rootDir, 'apps/desktop/src-tauri/Cargo.lock'),
      'forge-org-desktop',
    ),
  };
}

export function assertReleaseMetadata(rootDir, { version, tag }) {
  const metadata = readReleaseMetadata(rootDir);
  const mismatches = Object.entries(metadata)
    .filter(([, actual]) => actual !== version)
    .map(([field, actual]) => `${field}=${actual ?? '<missing>'}, expected ${version}`);
  const escapedVersion = version.replaceAll('.', String.raw`\.`);
  const tagPattern = new RegExp(String.raw`^v${escapedVersion}-preview\.[1-9][0-9]*$`);
  if (!tagPattern.test(tag)) {
    mismatches.push(`tag=${tag}, expected v${version}-preview.<n>`);
  }
  if (mismatches.length > 0) {
    throw new Error(`Release metadata mismatch: ${mismatches.join('; ')}`);
  }
  return metadata;
}

if (import.meta.main) {
  const version =
    process.env.RELEASE_VERSION ?? readJson(path.join(process.cwd(), 'package.json')).version;
  const tag = process.env.RELEASE_TAG ?? '';
  assertReleaseMetadata(process.cwd(), { version, tag });
  console.log(`Release metadata verified for ${tag}`);
}
