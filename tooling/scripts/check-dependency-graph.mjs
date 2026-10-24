import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const sourceRoots = [
  'packages/api-client/src',
  'apps/web/src',
];
const sourceExtensions = ['.ts', '.tsx'];
const normalize = (file) => relative(root, file).split(sep).join('/');

function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? filesIn(path)
      : sourceExtensions.includes(extname(path))
        ? [path]
        : [];
  });
}

const files = sourceRoots.flatMap((dir) => filesIn(resolve(root, dir)));
const known = new Set(files);

function resolveLocal(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(from), specifier);
  for (const candidate of [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => join(base, `index${extension}`)),
  ]) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

function dependencies(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const result = [];
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const value = node.moduleSpecifier;
      if (value && ts.isStringLiteral(value)) {
        const target = resolveLocal(file, value.text);
        if (target) result.push(target);
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const value = node.moduleReference.expression;
      if (value && ts.isStringLiteral(value)) {
        const target = resolveLocal(file, value.text);
        if (target) result.push(target);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...new Set(result)];
}

export function findCyclesInGraph(graph) {
  const state = new Map();
  const stack = [];
  const cycles = [];
  function visit(file) {
    if (state.get(file) === 1) {
      const start = stack.indexOf(file);
      cycles.push([...stack.slice(start), file].map(normalize).join(' -> '));
      return;
    }
    if (state.get(file) === 2) return;
    state.set(file, 1);
    stack.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    stack.pop();
    state.set(file, 2);
  }
  for (const file of graph.keys()) visit(file);
  return [...new Set(cycles)];
}

export function findCycles() {
  return findCyclesInGraph(new Map(files.map((file) => [file, dependencies(file)])));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cycles = findCycles();
  if (cycles.length) {
    console.error(`Dependency cycles detected:\n${cycles.join('\n')}`);
    process.exit(1);
  }
  console.log('AST dependency graph: PASS');
}
