import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegistry } from './product-acceptance-registry.mjs';

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

test('requires reasons for product gaps, manual reviews and blocked coverage', () => {
  const invalid = frame('4:32', [], 'BLOCKED_WITH_REASON');
  invalid.notes = null;
  assert.throws(
    () => validateRegistry(manifest, [{ domain: 'core', frames: [invalid, frame('4:158')] }]),
    /BLOCKED_WITH_REASON.*notes/i,
  );
});
