import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const STATUSES = new Set([
  'AUTOMATED_PASS',
  'AUTOMATED_FAIL',
  'NOT_IMPLEMENTED_PRODUCT_GAP',
  'DESIGN_REFERENCE_ONLY',
  'MANUAL_REVIEW_REQUIRED',
  'BLOCKED_WITH_REASON',
]);
const CLASSIFICATIONS = new Set([
  'EXECUTABLE_PRODUCT_WORKFLOW',
  'ALTERNATE_PRODUCT_STATE',
  'VISUAL_LAYOUT_REFERENCE',
  'COMPONENT_REFERENCE',
  'PROPOSED_UNIMPLEMENTED_BEHAVIOR',
]);
const REASON_REQUIRED = new Set([
  'AUTOMATED_FAIL',
  'NOT_IMPLEMENTED_PRODUCT_GAP',
  'MANUAL_REVIEW_REQUIRED',
  'BLOCKED_WITH_REASON',
]);

export function validateRegistry(manifest, shards, declaredTestIds, declaredEvidencePaths) {
  const expected = new Map();
  for (const page of manifest.pages ?? []) {
    for (const [nodeId, title] of page.frames ?? []) {
      if (expected.has(nodeId)) throw new Error(`Duplicate Figma node ${nodeId} in manifest.`);
      expected.set(nodeId, {
        page_id: page.page_id,
        page_name: page.page_name,
        screen_state: title,
      });
    }
  }
  const found = new Map();
  for (const shard of shards) {
    if (!shard || typeof shard.domain !== 'string' || !Array.isArray(shard.frames)) {
      throw new Error('Each coverage shard must define a domain and frames array.');
    }
    for (const frame of shard.frames) {
      const id = frame.figma_node_id;
      if (found.has(id)) throw new Error(`Duplicate Figma node ${id} in coverage shards.`);
      if (!expected.has(id)) throw new Error(`Unexpected Figma node ${id} in coverage shards.`);
      const source = expected.get(id);
      for (const key of ['page_id', 'page_name', 'screen_state']) {
        if (frame[key] !== source[key])
          throw new Error(`Figma node ${id} ${key} does not match manifest.`);
      }
      if (!CLASSIFICATIONS.has(frame.classification))
        throw new Error(`Figma node ${id} has invalid classification.`);
      if (!STATUSES.has(frame.status)) throw new Error(`Figma node ${id} has invalid status.`);
      for (const key of ['test_ids', 'evidence']) {
        if (!Array.isArray(frame[key]) || frame[key].some((value) => typeof value !== 'string')) {
          throw new Error(`Figma node ${id} requires a ${key} string array.`);
        }
      }
      for (const key of ['route', 'user_action', 'expected_result', 'notes']) {
        if (frame[key] !== null && typeof frame[key] !== 'string') {
          throw new Error(`Figma node ${id} requires ${key} to be a string or null.`);
        }
      }
      if (frame.status === 'AUTOMATED_PASS' && (!frame.test_ids.length || !frame.evidence.length)) {
        throw new Error(`AUTOMATED_PASS for Figma node ${id} requires test IDs and evidence.`);
      }
      if (declaredTestIds) {
        const unknownTestIds = frame.test_ids.filter((testId) => !declaredTestIds.has(testId));
        if (unknownTestIds.length) {
          throw new Error(
            `Figma node ${id} references unknown acceptance test ID(s): ${unknownTestIds.join(', ')}.`,
          );
        }
      }
      if (declaredEvidencePaths) {
        const unknownEvidence = frame.evidence.filter(
          (evidence) => !declaredEvidencePaths.has(evidence.replaceAll('\\', '/')),
        );
        if (unknownEvidence.length) {
          throw new Error(
            `Figma node ${id} references unknown evidence reference(s): ${unknownEvidence.join(', ')}.`,
          );
        }
      }
      if (REASON_REQUIRED.has(frame.status) && !frame.notes?.trim()) {
        throw new Error(`${frame.status} for Figma node ${id} requires notes.`);
      }
      found.set(id, { ...frame, domain: shard.domain });
    }
  }
  const missing = [...expected.keys()].filter((id) => !found.has(id));
  if (missing.length) throw new Error(`Missing Figma nodes: ${missing.join(', ')}.`);
  const frames = [...expected.keys()].map((id) => found.get(id));
  const status_counts = Object.fromEntries(
    [...STATUSES].map((status) => [
      status,
      frames.filter((frame) => frame.status === status).length,
    ]),
  );
  return {
    schema_version: 1,
    source: { file_key: manifest.file_key, description: manifest.source },
    frame_count: frames.length,
    status_counts,
    frames,
  };
}

function collectAcceptanceTestIds(directory) {
  const ids = new Set();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const id of collectAcceptanceTestIds(path)) ids.add(id);
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/\bPA-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g)) ids.add(match[0]);
    }
  }
  return ids;
}

function collectAcceptanceTestFiles(root, directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectAcceptanceTestFiles(root, path));
    else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(relative(root, path).replaceAll('\\', '/'));
    }
  }
  return files;
}

function renderMarkdown(registry) {
  const counts = Object.entries(registry.status_counts).filter(([, count]) => count > 0);
  const lines = [
    '# Product acceptance coverage matrix',
    '',
    `Source: checked-in snapshot captured from live Figma metadata, file \`${registry.source.file_key}\`. CI validates this snapshot against the acceptance shards but does not refresh Figma. ${registry.frame_count} top-level frames are inventoried; this is not a claim of full functional or visual certification.`,
    '',
    ...counts.map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Acceptance dimensions',
    '',
    `- Functional: ${registry.status_counts.AUTOMATED_PASS} Figma frames have linked automated behavior evidence; non-pass states remain explicit and no complete-coverage claim is made.`,
    '- Responsive: the full behavioral suite runs in Desktop Chrome (1280×720) and a 390×844 responsive Chromium project. UX-02 additionally captures Planning and Readiness at 1440, 1280, 1024, 390 and 375px in Dark and Light; Run, Handoff, Repository, Context Package, Evidence, Verification and Candidate detail routes are captured at 1280 and 390px. This is browser layout evidence, not native-device or touch certification.',
    '- Accessibility: PA-A11Y-01 exercises theme persistence, keyboard command navigation, focus restoration, and axe WCAG 2.1 A/AA checks on the command palette and Planning route.',
    '- Visual: tagged screenshots are captured as evidence; no approved pixel-diff baselines exist and no human Figma parity review is implied.',
    '- Native Desktop: the Windows UI Automation smoke installs the NSIS app, checks visible-window and React UI state, creates workspace/project records through the installed app, verifies isolated SQLite persistence after restart, single-instance activation, and sidecar cleanup. Installed import/export interaction remains blocked; consult the run-specific GitHub Actions status and uploaded artifact for execution results.',
    '- Execution evidence: each local or CI run writes a run-scoped acceptance report and Playwright JSON report. This registry maps Figma frames to automated journeys; its coverage statuses are not a live result for a particular run. CI does not refresh Figma metadata or imply human visual certification.',
    '',
    '| Figma node | Screen | Domain | Classification | Status | Tests | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...registry.frames.map(
      (frame) =>
        `| ${frame.figma_node_id} | ${frame.screen_state.replaceAll('|', '\\|')} | ${frame.domain} | ${frame.classification} | ${frame.status} | ${frame.test_ids.join(', ') || '—'} | ${(frame.notes ?? '—').replaceAll('|', '\\|')} |`,
    ),
    '',
    'Automated browser behavior and human-reviewed Figma visual parity are separate claims. No human visual certification is implied by this registry.',
    '',
  ];
  return lines.join('\n');
}

export async function buildRegistryFiles(root = process.cwd()) {
  const directory = join(root, 'docs/quality/product-acceptance');
  const manifest = JSON.parse(readFileSync(join(directory, 'figma-frame-manifest.json'), 'utf8'));
  const shards = readdirSync(directory)
    .filter((name) => name.endsWith('.json') && name !== 'figma-frame-manifest.json')
    .sort()
    .map((name) => JSON.parse(readFileSync(join(directory, name), 'utf8')));
  const declaredTestIds = collectAcceptanceTestIds(join(root, 'apps/web/e2e'));
  const declaredEvidencePaths = new Set(
    collectAcceptanceTestFiles(root, join(root, 'apps/web/e2e')),
  );
  const registry = validateRegistry(manifest, shards, declaredTestIds, declaredEvidencePaths);
  const outputs = [
    [
      join(root, 'docs/quality/product-acceptance-registry.json'),
      `${JSON.stringify(registry, null, 2)}\n`,
    ],
    [join(root, 'docs/quality/product-acceptance-matrix.md'), renderMarkdown(registry)],
  ];
  return new Map(
    await Promise.all(
      outputs.map(async ([path, contents]) => {
        const prettierOptions = (await resolveConfig(path)) ?? {};
        return [path, await format(contents, { ...prettierOptions, filepath: path })];
      }),
    ),
  );
}

async function run() {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const check = process.argv.includes('--check');
  for (const [path, contents] of await buildRegistryFiles(root)) {
    if (check) {
      let current = '';
      try {
        current = readFileSync(path, 'utf8');
      } catch {
        /* missing is a stale generated artifact */
      }
      if (current !== contents)
        throw new Error(`${path} is stale; run npm run acceptance:registry.`);
    } else {
      writeFileSync(path, contents);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
