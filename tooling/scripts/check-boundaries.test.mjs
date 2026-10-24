import test from 'node:test';
import assert from 'node:assert/strict';
import { issuesFor, checkRepo } from './check-boundaries.mjs';

test('local API client cannot import shared UI', () => {
  assert.equal(
    issuesFor(
      'packages/api-client/src/transport.ts',
      "import { Button } from '@corefoundry-labs/forge-ui';",
    ).length,
    1,
  );
});
test('feature imports shared package via public barrel', () => {
  assert.equal(
    issuesFor(
      'apps/web/src/features/planning/components/Card.tsx',
      "import { Button } from '@corefoundry-labs/forge-ui';",
    ).length,
    0,
  );
});
test('consumers cannot deep-import icon package internals', () => {
  assert.equal(
    issuesFor(
      'apps/web/src/features/planning/components/Icon.tsx',
      "import { Search } from '@corefoundry-labs/forge-icons/src/Search';",
    ).length,
    1,
  );
});
test('local API client cannot cross into feature source', () => {
  assert.equal(
    issuesFor(
      'packages/api-client/src/transport.ts',
      "import { OrganizationPage } from '../../apps/web/src/features/organization/index';",
    ).filter((issue) => issue.includes('crossed package boundary')).length,
    1,
  );
});
test('cross-feature private imports are prohibited', () => {
  assert.equal(
    issuesFor(
      'apps/web/src/features/planning/routes/X.tsx',
      "import { foo } from '../../organization/components/private';",
    ).length,
    1,
  );
});
test('cross-feature index is an explicit public surface', () => {
  assert.equal(
    issuesFor(
      'apps/web/src/features/planning/routes/X.tsx',
      "import { bar } from '../../organization/index';",
    ).length,
    0,
  );
});
test('current repository is compliant', () => {
  assert.deepEqual(checkRepo(), []);
});
