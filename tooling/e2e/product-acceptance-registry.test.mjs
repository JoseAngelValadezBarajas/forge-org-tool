import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRACKS,
  buildRegistryFiles,
  renderDocuments,
  validateRegistry,
} from './product-acceptance-registry.mjs';

const manifest = {
  schema_version: 1,
  file_key: 'figma-file',
  pages: [
    {
      page_id: '1:5',
      page_name: 'Core',
      frames: [
        ['4:32', 'Workspace'],
        ['4:158', 'Project'],
      ],
    },
  ],
};

function frame(figma_node_id, test_ids = ['PA-001'], status = 'AUTOMATED_PASS') {
  return {
    figma_node_id,
    page_id: '1:5',
    page_name: 'Core',
    screen_state: figma_node_id === '4:32' ? 'Workspace' : 'Project',
    classification: 'EXECUTABLE_PRODUCT_WORKFLOW',
    route: '/',
    user_action: 'Create the record.',
    expected_result: 'The persisted record is visible.',
    test_ids,
    evidence:
      status === 'AUTOMATED_PASS'
        ? ['test-results/product-acceptance/run/playwright-results.json']
        : [],
    status,
    track: 'active',
    notes: null,
  };
}

test('validates exact Figma-frame coverage and orders the registry by the live manifest', () => {
  const registry = validateRegistry(manifest, [
    { domain: 'core', frames: [frame('4:158'), frame('4:32')] },
  ]);
  assert.deepEqual(
    registry.frames.map((item) => item.figma_node_id),
    ['4:32', '4:158'],
  );
  assert.equal(registry.frame_count, 2);
  assert.equal(registry.status_counts.AUTOMATED_PASS, 2);
});

test('rejects omitted and duplicate Figma nodes instead of silently reporting partial inventory', () => {
  assert.throws(
    () => validateRegistry(manifest, [{ domain: 'core', frames: [frame('4:32')] }]),
    /missing.*4:158/i,
  );
  assert.throws(
    () =>
      validateRegistry(manifest, [
        { domain: 'a', frames: [frame('4:32')] },
        { domain: 'b', frames: [frame('4:32'), frame('4:158')] },
      ]),
    /duplicate.*4:32/i,
  );
});

test('rejects false automated passes without named tests and retained evidence', () => {
  const invalid = frame('4:32', [], 'AUTOMATED_PASS');
  assert.throws(
    () => validateRegistry(manifest, [{ domain: 'core', frames: [invalid, frame('4:158')] }]),
    /AUTOMATED_PASS.*test/i,
  );
});

test('rejects automated coverage that references an acceptance test ID absent from the test suite', () => {
  assert.throws(
    () =>
      validateRegistry(
        manifest,
        [{ domain: 'core', frames: [frame('4:32', ['PA-MISSING']), frame('4:158')] }],
        new Set(['PA-001']),
      ),
    /unknown acceptance test ID.*PA-MISSING/i,
  );
});

test('rejects evidence references that do not resolve to a retained repository artifact', () => {
  const invalid = frame('4:32');
  invalid.evidence = ['test-results/product-acceptance/<run>/playwright-results.json'];
  assert.throws(
    () =>
      validateRegistry(
        manifest,
        [{ domain: 'core', frames: [invalid, frame('4:158')] }],
        new Set(['PA-001']),
        new Set(['apps/web/e2e/organization/organization-workflows.spec.ts']),
      ),
    /unknown evidence reference.*playwright-results\.json/i,
  );
});

test('requires reasons for product gaps, manual reviews and blocked coverage', () => {
  const invalid = frame('4:32', [], 'BLOCKED_WITH_REASON');
  invalid.notes = null;
  assert.throws(
    () => validateRegistry(manifest, [{ domain: 'core', frames: [invalid, frame('4:158')] }]),
    /BLOCKED_WITH_REASON.*notes/i,
  );
});

test('generated active acceptance does not present a stale run result as current registry evidence', async () => {
  const outputs = await buildRegistryFiles();
  const markdown = [...outputs.entries()].find(([path]) =>
    path.endsWith('active-product-acceptance.md'),
  )?.[1];

  assert.ok(markdown);
  assert.match(markdown, /run-scoped acceptance report/i);
  assert.doesNotMatch(markdown, /passed 50\/50|CI run \d+ passed/i);
});

test('every frame needs a valid track so a retired capability cannot pose as a product gap', () => {
  const missing = frame('4:32');
  delete missing.track;
  assert.throws(
    () => validateRegistry(manifest, [{ domain: 'core', frames: [missing, frame('4:158')] }]),
    /invalid track/i,
  );
  const unknown = { ...frame('4:32'), track: 'retired' };
  assert.throws(
    () => validateRegistry(manifest, [{ domain: 'core', frames: [unknown, frame('4:158')] }]),
    /invalid track/i,
  );
});

test('counts every status per track and keeps the total equal to the frame count', () => {
  const retired = { ...frame('4:158', [], 'NOT_IMPLEMENTED_PRODUCT_GAP'), track: 'history' };
  retired.notes = 'Retired capability.';
  const registry = validateRegistry(manifest, [
    { domain: 'core', frames: [frame('4:32'), retired] },
  ]);

  assert.equal(registry.track_counts.active.AUTOMATED_PASS, 1);
  assert.equal(registry.track_counts.history.NOT_IMPLEMENTED_PRODUCT_GAP, 1);
  assert.equal(registry.track_counts.future.AUTOMATED_PASS, 0);
  const total = TRACKS.flatMap((track) => Object.values(registry.track_counts[track])).reduce(
    (sum, count) => sum + count,
    0,
  );
  assert.equal(total, registry.frame_count);
});

test('splits the documents by track and keeps retired gaps out of the active numbers', () => {
  const retired = { ...frame('4:158', [], 'NOT_IMPLEMENTED_PRODUCT_GAP'), track: 'history' };
  retired.notes = 'Retired capability.';
  const registry = validateRegistry(manifest, [
    { domain: 'core', frames: [frame('4:32'), retired] },
  ]);
  const documents = Object.fromEntries(renderDocuments(registry));

  assert.deepEqual(Object.keys(documents), [
    'product-acceptance-matrix.md',
    'active-product-acceptance.md',
    'design-history.md',
    'future-candidates.md',
  ]);
  assert.match(documents['active-product-acceptance.md'], /\| 4:32 \|/);
  assert.doesNotMatch(documents['active-product-acceptance.md'], /\| 4:158 \|/);
  assert.doesNotMatch(documents['active-product-acceptance.md'], /NOT_IMPLEMENTED_PRODUCT_GAP/);
  assert.match(documents['design-history.md'], /\| 4:158 \|/);
  assert.match(documents['design-history.md'], /not product gaps/i);
  assert.match(documents['product-acceptance-matrix.md'], /Status of the active product/);
  assert.doesNotMatch(documents['product-acceptance-matrix.md'], /NOT_IMPLEMENTED_PRODUCT_GAP/);
  assert.match(documents['future-candidates.md'], /Assisted migration between Local and Supabase/);
});

test('the checked-in registry has a track for every frame and no retired gap in the active track', async () => {
  const outputs = await buildRegistryFiles();
  const registry = JSON.parse(
    [...outputs.entries()].find(([path]) =>
      path.endsWith('product-acceptance-registry.json'),
    )?.[1] ?? '{}',
  );
  assert.equal(registry.frames.length, registry.frame_count);
  assert.ok(registry.frames.every((item) => TRACKS.includes(item.track)));
  const activeGaps = registry.frames.filter(
    (item) => item.track === 'active' && item.status === 'NOT_IMPLEMENTED_PRODUCT_GAP',
  );
  for (const gap of activeGaps) {
    assert.ok(gap.notes?.trim(), `active gap ${gap.figma_node_id} must explain itself`);
  }
  assert.ok(
    registry.frames
      .filter((item) => item.track === 'history')
      .every(
        (item) =>
          item.domain !== 'organization-planning-readiness' ||
          /^UX-00 \/ (27|3[4-9]|4[0-4]) /.test(item.screen_state),
      ),
    'only the retired Decisions, Invariants and Readiness frames may be history inside the active domain',
  );
});
