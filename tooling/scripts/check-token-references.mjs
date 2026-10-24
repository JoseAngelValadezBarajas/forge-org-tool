import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const tokenCss = resolve(root, 'node_modules/@corefoundry-labs/forge-tokens/dist/tokens.css');
const tokenSource = JSON.parse(readFileSync(resolve(root, 'node_modules/@corefoundry-labs/forge-tokens/dist/tokens.json'), 'utf8'));

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.css$/.test(entry.name) ? [path] : [];
  });

const declared = new Set(
  [...readFileSync(tokenCss, 'utf8').matchAll(/(--forge-[\w-]+)\s*:/g)].map((match) => match[1]),
);
const references = /var\((--forge-[\w-]+)/g;
const files = ['apps/web/src'].flatMap((directory) => walk(resolve(root, directory)));
const missing = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(references)) {
    if (!declared.has(match[1]))
      missing.push(`${relative(root, file).split(sep).join('/')}: ${match[1]}`);
  }
}

if (missing.length) {
  console.error(`Unresolved design tokens:\n${missing.join('\n')}`);
  process.exit(1);
}

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
const contrastPairs = [
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
];
const lowContrast = [];
const requiredSemantic = [
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
const incomplete = [];
for (const mode of ['dark', 'light']) {
  const values = tokenSource.semantic[mode];
  for (const token of requiredSemantic) {
    if (!values[token]) incomplete.push(`${mode} semantic.${mode}.${token}`);
  }
}
if (incomplete.length) {
  console.error(`Missing required semantic tokens:\n${incomplete.join('\n')}`);
  process.exit(1);
}
for (const mode of ['dark', 'light']) {
  const values = tokenSource.semantic[mode];
  for (const [foreground, background] of contrastPairs) {
    const first = luminance(values[foreground]);
    const second = luminance(values[background]);
    const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    if (ratio < 4.5)
      lowContrast.push(`${mode} ${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
  }
}
if (lowContrast.length) {
  console.error(`Semantic contrast below 4.5:1:\n${lowContrast.join('\n')}`);
  process.exit(1);
}
console.log(`Design token references resolved (${files.length} CSS files)`);
console.log('Checked semantic, action, and status foreground contrast passes WCAG AA (4.5:1)');
