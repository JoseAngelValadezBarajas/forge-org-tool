import fs from 'node:fs';

function escapePropertiesValue(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')
    .replaceAll('=', '\\=')
    .replaceAll(':', '\\:');
}

function signingConfigBlock() {
  return [
    '    signingConfigs {',
    '        create("release") {',
    '            val keystorePropertiesFile = rootProject.file("keystore.properties")',
    '            val keystoreProperties = Properties()',
    '            if (keystorePropertiesFile.exists()) {',
    '                keystoreProperties.load(FileInputStream(keystorePropertiesFile))',
    '            }',
    '',
    '            keyAlias = keystoreProperties["keyAlias"] as String',
    '            keyPassword = keystoreProperties["keyPassword"] as String',
    '            storeFile = file(keystoreProperties["storeFile"] as String)',
    '            storePassword = keystoreProperties["storePassword"] as String',
    '        }',
    '    }',
    '',
  ].join('\n');
}

export function configureAndroidSigning({
  gradlePath,
  propertiesPath,
  keystorePath,
  alias,
  storePassword,
  keyPassword,
}) {
  for (const [name, value] of Object.entries({
    gradlePath,
    propertiesPath,
    keystorePath,
    alias,
    storePassword,
    keyPassword,
  })) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Android signing value ${name} is required`);
    }
  }
  if (!fs.existsSync(gradlePath)) {
    throw new Error(`Generated Android Gradle file does not exist: ${gradlePath}`);
  }
  if (!fs.existsSync(keystorePath)) {
    throw new Error(`Android keystore does not exist: ${keystorePath}`);
  }

  let gradle = fs.readFileSync(gradlePath, 'utf8');
  if (!gradle.includes('import java.io.FileInputStream')) {
    gradle = `import java.io.FileInputStream\n${gradle}`;
  }
  if (!gradle.includes('import java.util.Properties')) {
    gradle = `import java.util.Properties\n${gradle}`;
  }

  if (!gradle.includes('create("release")')) {
    const buildTypesIndex = gradle.indexOf('    buildTypes {');
    if (buildTypesIndex < 0) {
      throw new Error('Generated Android Gradle file has no buildTypes block');
    }
    gradle = `${gradle.slice(0, buildTypesIndex)}${signingConfigBlock()}${gradle.slice(buildTypesIndex)}`;
  }

  const releaseMarker = 'getByName("release") {';
  const releaseIndex = gradle.indexOf(releaseMarker);
  if (releaseIndex < 0) {
    throw new Error('Generated Android Gradle file has no release build type');
  }
  const releaseBodyStart = releaseIndex + releaseMarker.length;
  const releaseBody = gradle.slice(releaseBodyStart, releaseBodyStart + 1200);
  if (!releaseBody.includes('signingConfig = signingConfigs.getByName("release")')) {
    gradle = `${gradle.slice(0, releaseBodyStart)}\n            signingConfig = signingConfigs.getByName("release")${gradle.slice(releaseBodyStart)}`;
  }

  fs.writeFileSync(
    propertiesPath,
    [
      `keyAlias=${escapePropertiesValue(alias)}`,
      `storePassword=${escapePropertiesValue(storePassword)}`,
      `keyPassword=${escapePropertiesValue(keyPassword)}`,
      `storeFile=${escapePropertiesValue(keystorePath)}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  fs.writeFileSync(gradlePath, gradle);
}

if (import.meta.main) {
  configureAndroidSigning({
    gradlePath: process.env.ANDROID_GRADLE_FILE,
    propertiesPath: process.env.ANDROID_KEYSTORE_PROPERTIES_FILE,
    keystorePath: process.env.ANDROID_KEYSTORE_FILE,
    alias: process.env.ANDROID_KEY_ALIAS,
    storePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
    keyPassword: process.env.ANDROID_KEY_PASSWORD,
  });
  console.log('Android release signing configuration prepared');
}
