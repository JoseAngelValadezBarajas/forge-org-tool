import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { TRANSFER_LIMITS, detectImageType } from '../dist/index.js';
import { parsePackage } from '../dist/project-package.js';

const conformance = JSON.parse(
  readFileSync(
    new globalThis.URL('../../../contracts/transfer/conformance.json', import.meta.url),
    'utf8',
  ),
);

describe('shared transfer conformance vectors', () => {
  it('keeps the TypeScript limits equal to the shared reference', () => {
    assert.deepEqual({ ...TRANSFER_LIMITS }, conformance.limits);
  });

  for (const vector of conformance.image_vectors) {
    it(`detects image type for: ${vector.name}`, () => {
      const bytes = new Uint8Array(globalThis.Buffer.from(vector.base64, 'base64'));
      assert.equal(detectImageType(bytes), vector.detected_type);
    });
  }

  it('keeps due_date through package parsing and never adds it when absent', async () => {
    const dateRule = conformance.due_date;
    assert.equal(dateRule.omit_when_empty, true);
    for (const value of dateRule.valid) assert.match(value, new RegExp(dateRule.pattern));
    const manifest = {
      schema_version: 'forge-project-transfer-v2',
      project: { name: 'Deadlines' },
      epics: [],
      features: [
        { ref: 'item:dated', title: 'Ship', due_date: dateRule.valid[0] },
        { ref: 'item:undated', title: 'Someday' },
      ],
      dependencies: [],
    };
    const archive = zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)) });
    const { document } = await parsePackage(globalThis.Buffer.from(archive).toString('base64'));
    assert.equal(document.features[0].due_date, dateRule.valid[0]);
    assert.equal('due_date' in document.features[1], false);
  });
});
