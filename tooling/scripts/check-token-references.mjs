import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const tokenCss = resolve(root, 'packages/tokens/src/tokens.css');

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
const files = ['packages/ui/src', 'apps/web/src'].flatMap((directory) =>
  walk(resolve(root, directory)),
);
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
console.log(`Design token references resolved (${files.length} CSS files)`);
