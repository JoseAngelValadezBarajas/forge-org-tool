import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const workflowPath = path.resolve(
  import.meta.dirname,
  '../../.github/workflows/release-preview.yml',
);

test('defines a human-gated Windows and Android Preview distribution workflow', () => {
  assert.equal(fs.existsSync(workflowPath), true);
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflow, /push:\s*\n\s*tags:\s*\n\s*- ['"]v\*-preview\.\*['"]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(
    workflow,
    /github\.event_name == 'workflow_dispatch' && github\.ref != 'refs\/heads\/main'/,
  );
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.equal((workflow.match(/environment:\s*release/g) ?? []).length, 2);
  assert.match(workflow, /runs-on:\s+ubuntu-24\.04/);
  assert.match(workflow, /runs-on:\s+windows-(?:latest|2025)/);

  assert.match(workflow, /npx tauri android init --ci --skip-targets-install/);
  assert.match(workflow, /npx tauri android build --ci --apk --target aarch64/);
  assert.match(workflow, /configure-android-signing\.mjs/);
  assert.match(workflow, /keytool -list/);
  assert.match(workflow, /"\$apksigner" verify --verbose --print-certs/);
  assert.match(workflow, /sha256sum/);

  assert.match(workflow, /merge-base --is-ancestor/, 'release tags must be reachable from main');
  assert.match(workflow, /workflows\/quality\.yml\/runs\?head_sha=/, 'Quality must pass first');
  assert.match(workflow, /ref: refs\/tags\/\$\{\{ env\.RELEASE_TAG \}\}/);
  assert.equal((workflow.match(/Remove signing material/g) ?? []).length, 2);
  assert.equal((workflow.match(/timeout-minutes:/g) ?? []).length, 3);
  assert.doesNotMatch(
    workflow,
    /uses: [\w./-]+@(?![0-9a-f]{40}\b)/,
    'every action is pinned to a full commit SHA',
  );

  assert.match(workflow, /npm run desktop:build:nsis/);
  assert.match(workflow, /\$env:TAURI_WINDOWS_RELEASE_CONFIG -and \(Test-Path/);
  assert.match(workflow, /signtool/);
  assert.match(workflow, /verify \/pa \/all/);
  assert.match(workflow, /WINDOWS_SIGNING_PENDING/);
  assert.match(workflow, /SHA256SUMS\.txt/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);

  assert.match(workflow, /ANDROID_KEYSTORE_BASE64/);
  assert.match(workflow, /WINDOWS_PFX_BASE64/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(
    workflow,
    /softprops\/action-gh-release|gh release create|actions\/create-release/,
  );
});
