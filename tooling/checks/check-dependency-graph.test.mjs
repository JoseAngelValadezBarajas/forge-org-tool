import test from 'node:test';
import assert from 'node:assert/strict';
import { findCycles, findCyclesInGraph } from './check-dependency-graph.mjs';

test('repository source has no local dependency cycles', () => {
  assert.deepEqual(findCycles(), []);
});

test('cycle detector reports a deliberate local cycle', () => {
  const a = 'packages/ui/src/a.ts';
  const b = 'packages/ui/src/b.ts';
  assert.deepEqual(
    findCyclesInGraph(
      new Map([
        [a, [b]],
        [b, [a]],
      ]),
    ),
    ['packages/ui/src/a.ts -> packages/ui/src/b.ts -> packages/ui/src/a.ts'],
  );
});
