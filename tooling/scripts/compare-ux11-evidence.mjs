import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const comparator = resolve(root, 'tooling/scripts/figma-visual-diff.mjs');
const evidence = resolve(root, 'docs/evidence/ux-1.1/visual-parity');
const cases = [
  ['344:3', '01-workspace-home-1440x960', '01-workspace-home-1440x960', '/', null],
  [
    '344:82',
    '02-project-board-dark-1440x960',
    '02-project-board-1440x960',
    '/planning/{workspaceId}/{projectId}',
    '02-project-board-dark-1440x960-geometry.json',
  ],
  [
    '344:182',
    '03-epic-board-1440x960',
    '03-epic-board-1440x960',
    '/planning/{workspaceId}/{projectId}/epics/{epicId}',
    null,
  ],
  [
    '347:54',
    '04-story-detail-1440x960',
    '04-story-detail-1440x960',
    '/planning/{workspaceId}/{projectId}/features/{featureId}',
    null,
  ],
  [
    '347:145',
    '05-bug-detail-1440x960',
    '05-bug-detail-1440x960',
    '/planning/{workspaceId}/{projectId}/features/{bugId}',
    null,
  ],
  [
    '347:224',
    '06-create-epic-1440x960',
    '06-create-epic-1440x960',
    '/planning/{workspaceId}/{projectId} (create drawer open)',
    '06-create-epic-1440x960-geometry.json',
  ],
  [
    '347:308',
    '07-contextual-transfer-preview-1440x960',
    '07-contextual-import-1440x960',
    '/transfer/{workspaceId}/{projectId}/epics/{projectId}',
    null,
  ],
  [
    '348:57',
    '08-workspace-tags-settings-1440x960',
    '08-workspace-tags-1440x960',
    '/workspaces/{workspaceId}/settings',
    null,
  ],
  [
    '348:129',
    '09-project-board-light-1440x960',
    '09-project-board-light-1440x960',
    '/planning/{workspaceId}/{projectId} (light)',
    null,
  ],
  [
    '348:210',
    '10-mobile-epic-board-390x844',
    '10-mobile-epic-board-390x844',
    '/planning/{workspaceId}/{projectId}/epics/{epicId} (mobile)',
    null,
  ],
];

let failed = false;
for (const [node, stem, referenceStem, route, geometry] of cases) {
  const reference = resolve(evidence, 'references', `${referenceStem}.png`);
  const actual = resolve(evidence, 'actual', `${stem}.png`);
  const output = resolve(evidence, 'differences');
  const args = [
    comparator,
    '--reference',
    reference,
    '--actual',
    actual,
    '--output-dir',
    output,
    '--overlay-dir',
    resolve(evidence, 'overlays'),
    '--report-dir',
    resolve(evidence, 'reports'),
    '--node',
    node,
    '--route',
    route,
    '--environment',
    'Chromium, 1440x960 desktop or 390x844 mobile, device scale factor 1, 100% zoom, Inter bundled, animations disabled',
  ];
  if (geometry) args.push('--geometry', resolve(evidence, 'actual', geometry));
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
