import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
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

export function validateRegistry(manifest, shards) {
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
    '- Responsive: journey scenarios run in desktop Chromium and a 390px mobile Chromium project; dedicated 1440px, 1280px, 1024px, and 375px multi-screen viewport certification remains open.',
    '- Accessibility: PA-A11Y-01 exercises theme persistence, keyboard command navigation, focus restoration, and axe WCAG 2.1 A/AA checks on the command palette and Planning route.',
    '- Visual: tagged screenshots are captured as evidence; no approved pixel-diff baselines exist and no human Figma parity review is implied.',
    '- Native Desktop: the Windows UI Automation smoke installs the NSIS app, creates workspace and project records, checks restart persistence and cleanup; local native execution is unavailable without Rust/Cargo, and CI must provide that evidence.',
    '- Current browser blocker: Delivery mobile pointer input is intercepted by the verification-history card when evaluating release gates; that workflow remains blocked.',
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
  const registry = validateRegistry(manifest, shards);
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
