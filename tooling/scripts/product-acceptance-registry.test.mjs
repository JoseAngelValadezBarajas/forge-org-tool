import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRegistryFiles, validateRegistry } from './product-acceptance-registry.mjs';

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

test('generated matrix does not present a stale run result as current registry evidence', async () => {
  const outputs = await buildRegistryFiles();
  const markdown = [...outputs.entries()].find(([path]) =>
    path.endsWith('product-acceptance-matrix.md'),
  )?.[1];

  assert.ok(markdown);
  assert.match(markdown, /run-scoped acceptance report/i);
  assert.doesNotMatch(markdown, /passed 50\/50|CI run \d+ passed/i);
});
