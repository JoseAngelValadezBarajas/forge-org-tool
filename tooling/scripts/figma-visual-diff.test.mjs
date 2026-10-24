import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';

const comparator = resolve('tooling/scripts/figma-visual-diff.mjs');

function writeSolidPng(path, rgba) {
  const image = new PNG({ width: 2, height: 2 });
  for (let index = 0; index < image.data.length; index += 4) image.data.set(rgba, index);
  writeFileSync(path, PNG.sync.write(image));
}

function runComparison(directory, extra = []) {
  const reference = join(directory, 'reference.png');
  const actual = join(directory, 'actual.png');
  const output = join(directory, 'output');
  const result = spawnSync(
    process.execPath,
    [
      comparator,
      '--reference',
      reference,
      '--actual',
      actual,
      '--output-dir',
      output,
      '--report-dir',
      output,
      '--overlay-dir',
      output,
      '--node',
      '1:2',
      '--route',
      '/visual-test',
      ...extra,
    ],
    { encoding: 'utf8' },
  );
  return { result, report: JSON.parse(readFileSync(join(output, 'actual.json'), 'utf8')) };
}

test('marks an unapproved measurement as not accepted without pretending visual parity passed', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-figma-diff-'));
  try {
    writeSolidPng(join(directory, 'reference.png'), [16, 16, 16, 255]);
    writeSolidPng(join(directory, 'actual.png'), [16, 16, 16, 255]);

    const { result, report } = runComparison(directory);

    assert.equal(result.status, 0);
    assert.equal(report.measurement.status, 'MEASURED');
    assert.equal(report.review.status, 'HUMAN_REVIEW_PENDING');
    assert.equal(report.status, 'VISUAL_FIDELITY_NOT_ACCEPTED');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects a structural geometry regression even when the raster comparison completed', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-figma-diff-'));
  try {
    writeSolidPng(join(directory, 'reference.png'), [16, 16, 16, 255]);
    writeSolidPng(join(directory, 'actual.png'), [16, 16, 16, 255]);
    const geometry = join(directory, 'geometry.json');
    writeFileSync(
      geometry,
      `${JSON.stringify({
        expectedFigma: { panel: { x: 20, y: 30, width: 100, height: 40 } },
        actual: { panel: { x: 20, y: 30, width: 112, height: 40 } },
      })}\n`,
    );

    const { result, report } = runComparison(directory, ['--geometry', geometry]);

    assert.equal(result.status, 1);
    assert.equal(report.measurement.status, 'STRUCTURAL_REGRESSION');
    assert.deepEqual(report.geometry.deviations.panel, {
      x: 0,
      y: 0,
      width: 12,
      height: 0,
      maxAbsoluteDeviation: 12,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects an approval record tied to a different reference digest', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-figma-diff-'));
  try {
    writeSolidPng(join(directory, 'reference.png'), [16, 16, 16, 255]);
    writeSolidPng(join(directory, 'actual.png'), [16, 16, 16, 255]);
    const approval = join(directory, 'approval.json');
    writeFileSync(
      approval,
      `${JSON.stringify({
        node: '1:2',
        referenceSha256: 'not-the-reference',
        reviewedBy: 'product-owner',
        reviewedAt: '2026-10-23T00:00:00.000Z',
        verdict: 'ACCEPTED',
      })}\n`,
    );

    const { result, report } = runComparison(directory, ['--approval', approval]);

    assert.equal(result.status, 1);
    assert.equal(report.review.status, 'APPROVAL_REFERENCE_MISMATCH');
    assert.equal(report.status, 'VISUAL_FIDELITY_NOT_ACCEPTED');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
