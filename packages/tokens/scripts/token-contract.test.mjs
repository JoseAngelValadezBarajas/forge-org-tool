import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const packageRoot = resolve(import.meta.dirname, '..');
const uiRoot = resolve(packageRoot, '..', 'ui');

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await cssFiles(path)));
    else if (entry.name.endsWith('.css')) files.push(path);
  }
  return files;
}

test('every shared UI token reference is emitted by the token package', async () => {
  const [tokenCss, files] = await Promise.all([
    readFile(join(packageRoot, 'src', 'tokens.css'), 'utf8'),
    cssFiles(join(uiRoot, 'src')),
  ]);
  const emitted = new Set(tokenCss.match(/--forge-[a-z0-9-]+(?=:)/g) ?? []);
  const referenced = new Set();
  for (const file of files) {
    const css = await readFile(file, 'utf8');
    for (const token of css.match(/--forge-[a-z0-9-]+/g) ?? []) referenced.add(token);
  }

  assert.deepEqual(
    [...referenced].filter((token) => !emitted.has(token)).sort(),
    [],
    'shared UI references an un-emitted design token',
  );
});

test('interactive and tag surfaces preserve their recorded values without claiming variable approval', async () => {
  const source = JSON.parse(await readFile(join(packageRoot, 'tokens.json'), 'utf8'));

  assert.equal(source.semantic.dark.surfaceInteractive, '#1b1f22');
  assert.equal(source.semantic.dark.surfaceTag, '#202428');
  assert.equal(source.semantic.light.surfaceInteractive, '#e9e8e5');
  assert.equal(source.semantic.light.surfaceTag, '#e5e2dd');
});

test('border subtle matches the explicit dark Figma register value', async () => {
  const source = JSON.parse(await readFile(join(packageRoot, 'tokens.json'), 'utf8'));

  assert.equal(source.semantic.dark.borderSubtle, '#262b30');
  assert.equal(source.semantic.light.borderSubtle, '#e1ded8');
});

test('token source defines complete dark and light semantic interaction coverage', async () => {
  const source = JSON.parse(await readFile(join(packageRoot, 'tokens.json'), 'utf8'));
  const required = [
    'bg',
    'surface',
    'surfaceRaised',
    'surfaceSunken',
    'surfaceInteractive',
    'surfaceHover',
    'surfaceActive',
    'surfaceDisabled',
    'textPrimary',
    'textSecondary',
    'textDisabled',
    'border',
    'borderSubtle',
    'borderStrong',
    'accentSoft',
    'statusNeutralBg',
    'focusRing',
    'accent',
    'accentContrast',
    'success',
    'warning',
    'danger',
    'info',
    'overlay',
    'selection',
    'statusSuccessBg',
    'statusWarningBg',
    'statusErrorBg',
    'statusInfoBg',
  ];

  for (const mode of ['dark', 'light']) {
    for (const token of required) {
      assert.ok(source.semantic[mode][token], `${mode} is missing semantic.${mode}.${token}`);
    }
  }
});

test('generated CSS scopes light variables and keeps dark as the unscoped default', async () => {
  const css = await readFile(join(packageRoot, 'src', 'tokens.css'), 'utf8');

  assert.match(css, /:root\s*,\s*\[data-theme="dark"\]/);
  assert.match(css, /\[data-theme="light"\]\s*\{/);
  assert.match(css, /--forge-text-disabled:/);
  assert.match(css, /--forge-overlay:/);
});

test('generated theme scopes set the native browser color scheme', async () => {
  const css = await readFile(join(packageRoot, 'src', 'tokens.css'), 'utf8');

  assert.match(css, /:root\s*,\s*\[data-theme="dark"\]\s*\{[^}]*color-scheme:\s*dark\s*;/s);
  assert.match(css, /\[data-theme="light"\]\s*\{[^}]*color-scheme:\s*light\s*;/s);
});

test('compiled tokens expose the documented primitive color palette', async () => {
  const css = await readFile(join(packageRoot, 'src', 'tokens.css'), 'utf8');

  assert.match(css, /--forge-palette-graphite-950:\s*#111315;/);
  assert.match(css, /--forge-palette-graphite-900:\s*#171a1d;/);
  assert.match(css, /--forge-palette-copper-500:\s*#d8874d;/);
  assert.match(css, /--forge-palette-success-700:\s*#187644;/);
});

test('semantic foreground tokens meet WCAG AA contrast on their paired surfaces', async () => {
  const source = JSON.parse(await readFile(join(packageRoot, 'tokens.json'), 'utf8'));
  const luminance = (hex) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)
      .map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };

  for (const mode of ['dark', 'light']) {
    for (const [foreground, background] of [
      ['textPrimary', 'bg'],
      ['textPrimary', 'accentSoft'],
      ['textPrimary', 'surfaceActive'],
      ['textSecondary', 'bg'],
      ['textSecondary', 'surface'],
      ['textSecondary', 'surfaceRaised'],
      ['textDisabled', 'bg'],
      ['textSecondary', 'statusNeutralBg'],
      ['accentContrast', 'accent'],
      ['surface', 'danger'],
      ['accent', 'surface'],
      ['success', 'surface'],
      ['warning', 'surface'],
      ['danger', 'surface'],
      ['info', 'surface'],
      ['accent', 'statusAccentBg'],
      ['success', 'statusSuccessBg'],
      ['warning', 'statusWarningBg'],
      ['danger', 'statusErrorBg'],
      ['info', 'statusInfoBg'],
    ]) {
      const values = source.semantic[mode];
      const first = luminance(values[foreground]);
      const second = luminance(values[background]);
      const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
      assert.ok(ratio >= 4.5, `${mode} ${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  }
});
