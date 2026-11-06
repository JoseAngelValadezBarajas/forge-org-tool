import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { TRANSFER_LIMITS, detectImageType } from '../dist/index.js';

const conformance = JSON.parse(
  readFileSync(new URL('../../../contracts/transfer/conformance.json', import.meta.url), 'utf8'),
);

describe('shared transfer conformance vectors', () => {
  it('keeps the TypeScript limits equal to the shared reference', () => {
    assert.deepEqual({ ...TRANSFER_LIMITS }, conformance.limits);
  });

  for (const vector of conformance.image_vectors) {
    it(`detects image type for: ${vector.name}`, () => {
      const bytes = new Uint8Array(Buffer.from(vector.base64, 'base64'));
      assert.equal(detectImageType(bytes), vector.detected_type);
    });
  }
});
