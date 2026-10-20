import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname, join, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
  f.isDirectory() ? walk(join(dir, f.name)) : /\.(ts|tsx)$/.test(f.name) ? [join(dir, f.name)] : []);
const rel = (p) => relative(root, p).split(sep).join('/');
const contained = (child, parent) => child === parent || child.startsWith(`${parent}/`);
const imports = (src) => [...src.matchAll(/(?:\bfrom\s*|\bimport\s*|\bexport\s*from\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);

export function issuesFor(filename, source) {
  const from = rel(resolve(root, filename));
  const issues = [];
  for (const target of imports(source)) {
    if (target.startsWith('@forge-org/ui/src/') || target.startsWith('@forge-org/api-client/src/') || target.startsWith('@forge-org/tokens/src/')) {
      issues.push(`${from}: do not deep-import package internals: ${target}`);
    }
    if (contained(from, 'packages/ui') && (target.startsWith('@forge-org/api-client') || target.startsWith('apps/') || target.includes('/features/') || target.includes('/app/'))) {
      issues.push(`${from}: generic UI must not import product, app, or API: ${target}`);
    }
    if (contained(from, 'packages/api-client') && (target.startsWith('@forge-org/ui') || target.includes('/features/'))) {
      issues.push(`${from}: API transport must not import UI/features: ${target}`);
    }
    if (target.startsWith('.')) {
      const destination = rel(resolve(root, dirname(from), target));
      if (contained(from, 'packages/ui') && !contained(destination, 'packages/ui'))
        issues.push(`${from}: UI source crossed package boundary: ${target}`);
      if (contained(from, 'packages/api-client') && !contained(destination, 'packages/api-client'))
        issues.push(`${from}: API client source crossed package boundary: ${target}`);
      if (contained(from, 'apps/web/src/features')) {
        const current = from.match(/^apps\/web\/src\/features\/([^/]+)/)?.[1];
        const targetFeature = destination.match(/^apps\/web\/src\/features\/([^/]+)/)?.[1];
        if (current && targetFeature && current !== targetFeature && basename(destination) !== 'index')
          issues.push(`${from}: cross-feature imports must use public index: ${target}`);
      }
    }
  }
  return issues;
}

export function checkRepo() {
  const dirs = ['packages/ui/src', 'packages/api-client/src', 'apps/web/src'];
  return dirs.flatMap((dir) => walk(resolve(root, dir)).flatMap((file) => issuesFor(rel(file), readFileSync(file, 'utf8'))));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkRepo();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log('Architecture import boundaries: PASS');
}
