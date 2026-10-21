import test from 'node:test';
import assert from 'node:assert/strict';
import { findCycles } from './check-dependency-graph.mjs';

test('repository source has no local dependency cycles', () => {
  assert.deepEqual(findCycles(), []);
});
