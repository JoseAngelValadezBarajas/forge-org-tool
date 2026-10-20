import test from 'node:test';
import assert from 'node:assert/strict';
import { issuesFor, checkRepo } from './check-boundaries.mjs';

test('shared UI cannot fetch from API client', () => {
  assert.equal(issuesFor('packages/ui/src/primitives/Test.tsx', "import { getApiJson } from '@forge-org/api-client';").length, 1);
});
test('feature imports shared package via public barrel', () => {
  assert.equal(issuesFor('apps/web/src/features/planning/components/Card.tsx', "import { Button } from '@forge-org/ui';").length, 0);
});
test('cross-feature private imports are prohibited', () => {
  assert.equal(issuesFor('apps/web/src/features/planning/routes/X.tsx', "import { foo } from '../../organization/components/private';").length, 1);
});
test('cross-feature index is an explicit public surface', () => {
  assert.equal(issuesFor('apps/web/src/features/planning/routes/X.tsx', "import { bar } from '../../organization/index';").length, 0);
});
test('current repository is compliant', () => {
  assert.deepEqual(checkRepo(), []);
});
