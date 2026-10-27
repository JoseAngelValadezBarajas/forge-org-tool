import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { configureAndroidSigning } from './configure-android-signing.mjs';

test('configures and repeats Android release signing without duplicating Gradle blocks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-android-signing-'));
  const gradlePath = path.join(root, 'app', 'build.gradle.kts');
  const propertiesPath = path.join(root, 'keystore.properties');
  const keystorePath = path.join(root, 'forge-upload.jks');
  fs.mkdirSync(path.dirname(gradlePath), { recursive: true });
  fs.writeFileSync(
    gradlePath,
    `plugins {\n    id("com.android.application")\n}\n\nandroid {\n    buildTypes {\n        getByName("debug") {\n            isDebuggable = true\n        }\n        getByName("release") {\n            isMinifyEnabled = true\n        }\n    }\n}\n`,
  );
  fs.writeFileSync(keystorePath, 'synthetic keystore bytes');

  configureAndroidSigning({
    gradlePath,
    propertiesPath,
    keystorePath,
    alias: 'forge-upload',
    storePassword: 'store=:\\secret#value',
    keyPassword: 'key=:\\secret#value',
  });
  const firstGradle = fs.readFileSync(gradlePath, 'utf8');
  const firstProperties = fs.readFileSync(propertiesPath, 'utf8');

  assert.match(firstProperties, /^keyAlias=forge-upload$/m);
  assert.match(firstProperties, /^storePassword=store\\=\\:\\\\secret#value$/m);
  assert.match(firstProperties, /^keyPassword=key\\=\\:\\\\secret#value$/m);
  const escapedKeystorePath = keystorePath.replaceAll('\\', '\\\\').replaceAll(':', '\\:');
  assert.ok(firstProperties.includes(`storeFile=${escapedKeystorePath}\n`));
  assert.equal((firstGradle.match(/create\("release"\)/g) ?? []).length, 1);
  assert.equal((firstGradle.match(/signingConfig = signingConfigs\.getByName\("release"\)/g) ?? []).length, 1);
  assert.match(firstGradle, /import java\.io\.FileInputStream/);
  assert.match(firstGradle, /import java\.util\.Properties/);

  configureAndroidSigning({
    gradlePath,
    propertiesPath,
    keystorePath,
    alias: 'forge-upload',
    storePassword: 'store=:\\secret#value',
    keyPassword: 'key=:\\secret#value',
  });
  assert.equal(fs.readFileSync(gradlePath, 'utf8'), firstGradle);
  assert.equal(fs.readFileSync(propertiesPath, 'utf8'), firstProperties);
  fs.rmSync(root, { recursive: true, force: true });
});
