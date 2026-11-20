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
// Which claim a frame belongs to. A retired capability is history, not a product gap.
export const TRACKS = ['active', 'history', 'future'];
const TRACK_SET = new Set(TRACKS);
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
      if (!TRACK_SET.has(frame.track)) throw new Error(`Figma node ${id} has invalid track.`);
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
  const track_counts = Object.fromEntries(
    TRACKS.map((track) => [
      track,
      Object.fromEntries(
        [...STATUSES].map((status) => [
          status,
          frames.filter((frame) => frame.track === track && frame.status === status).length,
        ]),
      ),
    ]),
  );
  return {
    schema_version: 2,
    source: { file_key: manifest.file_key, description: manifest.source },
    frame_count: frames.length,
    status_counts,
    track_counts,
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

const TRACK_TITLES = {
  active: 'Active product acceptance',
  history: 'Design history',
  future: 'Future candidates',
};

const FUTURE_CANDIDATES = [
  [
    'Start a project from a template or an existing project',
    'Figma frame UX-00 / 16. Creating a project is a name and nothing else; an origin (empty, import, template) would make the first minutes useful. Templates must create ordinary records, not a second template system.',
  ],
  [
    'Assisted migration between Local and Supabase',
    'Switching provider does not copy data today. A migration needs a preview, a backup and a confirmation before it touches anything.',
  ],
  [
    'Planning summary per project',
    'Counts derived only from recorded planning data (overdue, blocked, without an Epic, in Verify, quiet for two weeks). It must stay manual planning language, never CI-passed or ready.',
  ],
  [
    'Per-task reminders',
    'Due dates carry no time of day, so reminders are one digest a day. Per-task reminders would need a time on the date and a Windows notification per task.',
  ],
  [
    'Reintroducing Readiness, Delivery, Runs or Repositories',
    'Only after real users complete the Today, project, Epic, Done loop on a recurring basis. The retired Figma frames are kept in the design history for that day.',
  ],
];

const escapeCell = (value) => String(value ?? '—').replaceAll('|', '\\|');

function frameTable(frames) {
  return [
    '| Figma node | Screen | Domain | Classification | Status | Tests | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...frames.map(
      (frame) =>
        `| ${frame.figma_node_id} | ${escapeCell(frame.screen_state)} | ${frame.domain} | ${frame.classification} | ${frame.status} | ${frame.test_ids.join(', ') || '—'} | ${escapeCell(frame.notes)} |`,
    ),
  ];
}

function countLines(counts) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `- ${status}: ${count}`);
}

const SOURCE_LINE = (registry) =>
  `Source: checked-in snapshot captured from live Figma metadata, file \`${registry.source.file_key}\`. CI validates this snapshot against the acceptance shards but does not refresh Figma.`;

function renderOverview(registry) {
  const total = (track) => registry.frames.filter((frame) => frame.track === track).length;
  return [
    '# Product acceptance coverage matrix',
    '',
    SOURCE_LINE(registry),
    `${registry.frame_count} top-level frames are inventoried and each belongs to exactly one track. This is not a claim of full functional or visual certification.`,
    '',
    '| Track | Frames | What it answers |',
    '| --- | --- | --- |',
    `| [${TRACK_TITLES.active}](active-product-acceptance.md) | ${total('active')} | Does the shipping product do what its frames describe? Its gaps are real. |`,
    `| [${TRACK_TITLES.history}](design-history.md) | ${total('history')} | Frames of capabilities that were retired from the product. Kept for traceability; not gaps. |`,
    `| [${TRACK_TITLES.future}](future-candidates.md) | ${total('future')} | Ideas that are not built yet and the evidence needed before they are. |`,
    '',
    '## Status of the active product',
    '',
    ...countLines(registry.track_counts.active),
    '',
    'Only the active track says anything about the product that ships today. The design history lists retired capabilities and a status there means "retired", so it is not added to these numbers.',
    '',
    'Automated browser behavior and human-reviewed Figma visual parity are separate claims. No human visual certification is implied by this registry.',
    '',
  ];
}

function renderActive(registry) {
  const frames = registry.frames.filter((frame) => frame.track === 'active');
  const counts = registry.track_counts.active;
  return [
    '# Active product acceptance',
    '',
    SOURCE_LINE(registry),
    `${frames.length} frames describe the product that ships today. Non-pass states stay explicit and no complete-coverage claim is made.`,
    '',
    ...countLines(counts),
    '',
    '## Acceptance dimensions',
    '',
    `- Functional: ${counts.AUTOMATED_PASS} Figma frames have linked automated behavior evidence; the rest are listed below with their reason.`,
    '- Responsive: the full behavioral suite runs in Desktop Chrome (1280×720) and a 390×844 responsive Chromium project. This is browser layout evidence, not native-device or touch certification.',
    '- Accessibility: PA-A11Y-01 exercises theme persistence, keyboard command navigation, focus restoration, and axe WCAG 2.1 A/AA checks on the command palette and Planning route.',
    '- Visual: tagged screenshots are captured as evidence; no approved pixel-diff baselines exist and no human Figma parity review is implied.',
    '- Native Desktop: the Windows UI Automation smoke installs the NSIS app, checks that it opens on Today with the Personal workspace and Inbox project created, captures a task through the installed UI, verifies isolated SQLite persistence after restart, single-instance activation, and sidecar cleanup. Installed import/export interaction remains blocked; consult the run-specific GitHub Actions status and uploaded artifact for execution results.',
    '- Execution evidence: each local or CI run writes a run-scoped acceptance report and Playwright JSON report. This registry maps Figma frames to automated journeys; its coverage statuses are not a live result for a particular run. CI does not refresh Figma metadata or imply human visual certification.',
    '',
    ...frameTable(frames),
    '',
  ];
}

function renderHistory(registry) {
  const frames = registry.frames.filter((frame) => frame.track === 'history');
  return [
    '# Design history',
    '',
    SOURCE_LINE(registry),
    `${frames.length} frames belong to capabilities that were retired from the product (repositories and context packages, agent runs and handoffs, evidence, verification and release delivery, decisions, invariants and readiness). The code and its legacy tables were removed or retained by migrations only, per the project rules.`,
    '',
    '**These are not product gaps.** They are listed so the design record stays complete and so a future decision to bring one back starts from the original frame. A status such as NOT_IMPLEMENTED_PRODUCT_GAP here means "retired", not "missing".',
    '',
    ...countLines(registry.track_counts.history),
    '',
    ...frameTable(frames),
    '',
  ];
}

function renderFuture(registry) {
  const frames = registry.frames.filter((frame) => frame.track === 'future');
  return [
    '# Future candidates',
    '',
    'Ideas that are not built. None of them is a commitment, and none counts against the active product.',
    '',
    '| Candidate | Why it is a candidate |',
    '| --- | --- |',
    ...FUTURE_CANDIDATES.map(([name, why]) => `| ${escapeCell(name)} | ${escapeCell(why)} |`),
    '',
    '## Figma frames that describe a candidate',
    '',
    ...frameTable(frames),
    '',
  ];
}

export function renderDocuments(registry) {
  return [
    ['product-acceptance-matrix.md', renderOverview(registry)],
    ['active-product-acceptance.md', renderActive(registry)],
    ['design-history.md', renderHistory(registry)],
    ['future-candidates.md', renderFuture(registry)],
  ].map(([name, lines]) => [name, lines.join('\n')]);
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
    ...renderDocuments(registry).map(([name, contents]) => [
      join(root, 'docs/quality', name),
      contents,
    ]),
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
