import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { configureAndroidInsets, patchMainActivity } from './configure-android-insets.mjs';

// The activity `tauri android init` generates for this project.
const TEMPLATE = `package com.forge.orgtool

import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
`;

test('pads the web content by the system bars, cutouts and keyboard after the activity is created', () => {
  const { source, changed } = patchMainActivity(TEMPLATE);

  assert.equal(changed, true);
  assert.match(source, /^package com\.forge\.orgtool\n/);
  for (const line of [
    'import android.view.View',
    'import androidx.core.view.ViewCompat',
    'import androidx.core.view.WindowInsetsCompat',
  ]) {
    assert.equal(source.split(line).length - 1, 1, `${line} is imported once`);
  }
  // The inset listener must be installed after the window and its content view exist.
  assert.ok(
    source.indexOf('super.onCreate(savedInstanceState)') <
      source.indexOf('setOnApplyWindowInsetsListener'),
  );
  assert.match(source, /Type\.systemBars\(\) or WindowInsetsCompat\.Type\.displayCutout\(\)/);
  assert.match(source, /Type\.ime\(\)/);
  assert.match(source, /maxOf\(bars\.bottom, keyboard\.bottom\)/);
  assert.match(source, /WindowInsetsCompat\.CONSUMED/);
  assert.ok(
    source.includes('enableEdgeToEdge()'),
    'edge-to-edge stays on; the padding makes it safe',
  );
});

test('is idempotent', () => {
  const first = patchMainActivity(TEMPLATE);
  const second = patchMainActivity(first.source);
  assert.equal(second.changed, false);
  assert.equal(second.source, first.source);
  assert.equal(first.source.split('setOnApplyWindowInsetsListener').length - 1, 1);
});

test('handles Windows line endings', () => {
  const { source, changed } = patchMainActivity(TEMPLATE.replaceAll('\n', '\r\n'));
  assert.equal(changed, true);
  assert.match(source, /setOnApplyWindowInsetsListener/);
});

test('refuses a template it does not recognise instead of silently skipping the fix', () => {
  assert.throws(
    () => patchMainActivity('class MainActivity : AppCompatActivity() {}'),
    /not the Tauri template/,
  );
  assert.throws(
    () => patchMainActivity(TEMPLATE.replace('enableEdgeToEdge()', '')),
    /not the Tauri template/,
  );
});

test('finds the generated activity under its package folders and patches it in place', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-android-insets-'));
  const folder = path.join(root, 'com', 'forge', 'orgtool');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'MainActivity.kt'), TEMPLATE);

  const first = configureAndroidInsets(root);
  assert.equal(first.changed, true);
  assert.match(fs.readFileSync(first.activityPath, 'utf8'), /setOnApplyWindowInsetsListener/);
  assert.equal(configureAndroidInsets(root).changed, false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('reports a missing project or activity clearly', () => {
  assert.throws(
    () => configureAndroidInsets(path.join(os.tmpdir(), 'forge-missing-android')),
    /do not exist/,
  );
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-android-empty-'));
  assert.throws(() => configureAndroidInsets(empty), /No MainActivity\.kt/);
  fs.rmSync(empty, { recursive: true, force: true });
});
