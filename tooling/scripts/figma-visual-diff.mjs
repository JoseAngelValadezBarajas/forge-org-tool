import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

function args(argv) {
  const parsed = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key?.startsWith('--') || !argv[index + 1]) {
      throw new Error('Arguments must be supplied as --key value pairs.');
    }
    parsed[key.slice(2)] = argv[index + 1];
  }
  for (const required of ['reference', 'actual', 'output-dir', 'node', 'route']) {
    if (!parsed[required]) throw new Error(`Missing required argument --${required}.`);
  }
  return parsed;
}

function rectDeviation(expected, actual) {
  if (!expected || !actual) return null;
  const fields = ['x', 'y', 'width', 'height'];
  if (
    !fields.every(
      (field) => typeof expected[field] === 'number' && typeof actual[field] === 'number',
    )
  ) {
    return null;
  }
  const deviation = Object.fromEntries(
    fields.map((field) => [field, actual[field] - expected[field]]),
  );
  return {
    ...deviation,
    maxAbsoluteDeviation: Math.max(...Object.values(deviation).map(Math.abs)),
  };
}

function measureGeometry(geometry, tolerance = 1) {
  if (!geometry?.expectedFigma || !geometry?.actual)
    return { status: 'NOT_MEASURED', deviations: {} };
  const deviations = {};
  for (const [name, expected] of Object.entries(geometry.expectedFigma)) {
    const deviation = rectDeviation(expected, geometry.actual[name]);
    if (deviation) deviations[name] = deviation;
  }
  const structuralRegression = Object.values(deviations).some(
    (deviation) => deviation.maxAbsoluteDeviation > tolerance,
  );
  return {
    status: structuralRegression ? 'STRUCTURAL_REGRESSION' : 'MEASURED',
    tolerancePx: tolerance,
    deviations,
  };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readApproval(path, node, referenceSha256) {
  if (!path) return { status: 'HUMAN_REVIEW_PENDING', approval: null };
  const approval = JSON.parse(await readFile(resolve(path), 'utf8'));
  if (approval.node !== node) return { status: 'APPROVAL_NODE_MISMATCH', approval };
  if (approval.referenceSha256 !== referenceSha256)
    return { status: 'APPROVAL_REFERENCE_MISMATCH', approval };
  if (approval.verdict !== 'ACCEPTED' || !approval.reviewedBy || !approval.reviewedAt)
    return { status: 'APPROVAL_INVALID', approval };
  return { status: 'HUMAN_ACCEPTED', approval };
}

const options = args(process.argv);
const referencePath = resolve(options.reference);
const actualPath = resolve(options.actual);
const outputDirectory = resolve(options['output-dir']);
const reportDirectory = resolve(options['report-dir'] ?? outputDirectory);
const overlayDirectory = resolve(options['overlay-dir'] ?? outputDirectory);
const [referenceBytes, actualBytes] = await Promise.all([
  readFile(referencePath),
  readFile(actualPath),
]);
const reference = PNG.sync.read(referenceBytes);
const actual = PNG.sync.read(actualBytes);
if (reference.width !== actual.width || reference.height !== actual.height) {
  throw new Error(
    `Viewport mismatch: reference ${reference.width}x${reference.height}, actual ${actual.width}x${actual.height}.`,
  );
}

await Promise.all([
  mkdir(outputDirectory, { recursive: true }),
  mkdir(reportDirectory, { recursive: true }),
  mkdir(overlayDirectory, { recursive: true }),
]);
const diff = new PNG({ width: reference.width, height: reference.height });
const overlay = new PNG({ width: reference.width, height: reference.height });
const differentPixels = pixelmatch(
  reference.data,
  actual.data,
  diff.data,
  reference.width,
  reference.height,
  {
    threshold: 0,
    includeAA: true,
    alpha: 0.65,
    diffColor: [255, 0, 0],
    diffColorAlt: [0, 0, 255],
  },
);
for (let index = 0; index < reference.data.length; index += 4) {
  overlay.data[index] = Math.round((reference.data[index] + actual.data[index]) / 2);
  overlay.data[index + 1] = Math.round((reference.data[index + 1] + actual.data[index + 1]) / 2);
  overlay.data[index + 2] = Math.round((reference.data[index + 2] + actual.data[index + 2]) / 2);
  overlay.data[index + 3] = 255;
}

const totalPixels = reference.width * reference.height;
const geometry = options.geometry
  ? JSON.parse(await readFile(resolve(options.geometry), 'utf8'))
  : null;
const geometryMeasurement = measureGeometry(geometry);
const referenceSha256 = sha256(referenceBytes);
const review = await readApproval(options.approval, options.node, referenceSha256);
const rejected =
  geometryMeasurement.status === 'STRUCTURAL_REGRESSION' ||
  (options.approval && review.status !== 'HUMAN_ACCEPTED');
const report = {
  figmaNodeId: options.node,
  implementationRoute: options.route,
  reference: { path: referencePath, width: reference.width, height: reference.height },
  actual: { path: actualPath, width: actual.width, height: actual.height },
  environment: options.environment ?? 'Chromium, device scale factor 1, 100% browser zoom',
  comparison: {
    channelThreshold: 0,
    antiAliasingIncluded: true,
    differentPixels,
    totalPixels,
    differentPixelRatio: differentPixels / totalPixels,
  },
  referenceSha256,
  geometry: geometry
    ? {
        ...geometry,
        deviations: geometryMeasurement.deviations,
        tolerancePx: geometryMeasurement.tolerancePx,
      }
    : null,
  measurement: {
    status:
      geometryMeasurement.status === 'STRUCTURAL_REGRESSION' ? 'STRUCTURAL_REGRESSION' : 'MEASURED',
    structuralTolerancePx: geometryMeasurement.tolerancePx ?? null,
  },
  mismatchClassification: {
    geometry: geometry
      ? geometryMeasurement.status === 'STRUCTURAL_REGRESSION'
        ? `Structural regression exceeds ${geometryMeasurement.tolerancePx}px tolerance; see per-container deviations.`
        : 'Geometry measured; see per-container deviations.'
      : 'Not independently measured for this frame.',
    typography:
      'Raster difference is measured; font metrics and glyph-level mismatch classification require review.',
    colorsAndSurfaces: 'Raster difference is measured; color-region attribution requires review.',
    missingOrUnexpectedElements:
      'Not inferred from pixels; review actual and overlay against the exact reference.',
    masksApplied: false,
  },
  review: { ...review, approval: review.approval ?? undefined },
  visualReview: review.status,
  status:
    review.status === 'HUMAN_ACCEPTED' && geometryMeasurement.status !== 'STRUCTURAL_REGRESSION'
      ? 'VISUAL_FIDELITY_ACCEPTED_BY_HUMAN'
      : 'VISUAL_FIDELITY_NOT_ACCEPTED',
};
const stem = basename(actualPath, '.png');
const reportJson = resolve(reportDirectory, `${stem}.json`);
const reportMarkdown = resolve(reportDirectory, `${stem}.md`);
const differencePath = resolve(outputDirectory, `${stem}-difference.png`);
const overlayPath = resolve(overlayDirectory, `${stem}-overlay.png`);
const markdown = [
  `# Visual comparison — ${options.node}`,
  '',
  `- Route: \`${options.route}\``,
  `- Reference: \`${referencePath}\` (${reference.width}×${reference.height})`,
  `- Actual: \`${actualPath}\` (${actual.width}×${actual.height})`,
  `- Environment: ${report.environment}`,
  `- Exact differing pixels (threshold 0, antialias included): ${differentPixels}/${totalPixels} (${((100 * differentPixels) / totalPixels).toFixed(4)}%)`,
  `- Reference SHA-256: \`${referenceSha256}\``,
  `- Measurement status: ${report.measurement.status}`,
  `- Geometry: ${report.mismatchClassification.geometry}`,
  `- Typography: ${report.mismatchClassification.typography}`,
  `- Colors and surfaces: ${report.mismatchClassification.colorsAndSurfaces}`,
  `- Missing/unexpected elements: ${report.mismatchClassification.missingOrUnexpectedElements}`,
  `- Masking: none`,
  `- Visual review: ${report.visualReview}`,
  `- Status: ${report.status}`,
  '',
  'No regions are masked. Geometry results, if present, are separate from the raster diff. This report does not certify Figma parity.',
  '',
  `- Difference image: \`${differencePath}\``,
  `- 50% overlay: \`${overlayPath}\``,
].join('\n');

await Promise.all([
  writeFile(differencePath, PNG.sync.write(diff)),
  writeFile(overlayPath, PNG.sync.write(overlay)),
  writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(reportMarkdown, `${markdown}\n`),
]);
console.log(
  `${options.node}: ${differentPixels}/${totalPixels} pixels differ; reports saved to ${dirname(reportJson)}`,
);
if (rejected) process.exitCode = 1;
