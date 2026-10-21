import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateParity } from './validate-design-system-parity.mjs';

const canonical = {
  '173:27': { name: 'Button', category: 'core' },
  '206:690': { name: 'ButtonSize', category: 'core' },
  '177:150': { name: 'IconButton', category: 'core' },
  '173:47': { name: 'TextInput', category: 'core' },
  '173:58': { name: 'Checkbox', category: 'core' },
  '177:160': { name: 'Select', category: 'core' },
  '177:165': { name: 'Textarea', category: 'core' },
  '181:223': { name: 'FormField', category: 'core' },
  '181:234': { name: 'SearchField', category: 'core' },
  '181:312': { name: 'MultiSelect', category: 'core' },
  '206:606': { name: 'FilePicker', category: 'core' },
  '206:616': { name: 'FormActions', category: 'core' },
  '206:670': { name: 'Radio', category: 'core' },
  '206:683': { name: 'Switch', category: 'core' },
  '173:87': { name: 'Tab/Tabs', category: 'core' },
  '177:186': { name: 'Breadcrumbs', category: 'core' },
  '181:242': { name: 'MenuItem', category: 'core' },
  '181:255': { name: 'StepperStep', category: 'core' },
  '173:65': { name: 'Card', category: 'core' },
  '173:66': { name: 'MetricCard', category: 'core' },
  '173:40': { name: 'StatusChip', category: 'core' },
  '177:172': { name: 'Badge', category: 'core' },
  '173:82': { name: 'Alert', category: 'core' },
  '177:182': { name: 'StatePanel', category: 'core' },
  '181:300': { name: 'Progress', category: 'core' },
  '206:641': { name: 'Tooltip', category: 'core' },
  '206:650': { name: 'Skeleton', category: 'core' },
  '206:660': { name: 'Toast', category: 'core' },
  '181:271': { name: 'RecordRow', category: 'core' },
  '181:278': { name: 'KeyValueRow', category: 'core' },
  '181:334': { name: 'TableRow', category: 'core' },
  '206:636': { name: 'Table', category: 'core' },
  '206:580': { name: 'Dialog', category: 'core' },
  '206:593': { name: 'Popover', category: 'core' },
  '177:183': { name: 'SectionHeader', category: 'core' },
  '181:335': { name: 'Divider', category: 'core' },
  '181:337': { name: 'CodeLabel', category: 'core' },
  '208:740': { name: 'Plus', category: 'icon' },
  '208:743': { name: 'Close', category: 'icon' },
  '208:746': { name: 'Chevron', category: 'icon' },
  '208:749': { name: 'Check', category: 'icon' },
  '208:752': { name: 'Minus', category: 'icon' },
  '236:2225': { name: 'Search', category: 'icon' },
  '237:826': { name: 'Menu', category: 'icon' },
  '237:829': { name: 'Edit', category: 'icon' },
  '237:833': { name: 'Trash', category: 'icon' },
  '237:836': { name: 'Download', category: 'icon' },
  '237:839': { name: 'Upload', category: 'icon' },
  '237:842': { name: 'Filter', category: 'icon' },
  '237:845': { name: 'ArrowLeft', category: 'icon' },
  '237:848': { name: 'ArrowRight', category: 'icon' },
  '237:851': { name: 'ArrowUp', category: 'icon' },
  '237:854': { name: 'ArrowDown', category: 'icon' },
  '237:857': { name: 'AlertTriangle', category: 'icon' },
  '237:861': { name: 'Info', category: 'icon' },
  '237:865': { name: 'Clock', category: 'icon' },
  '237:869': { name: 'Folder', category: 'icon' },
  '237:872': { name: 'GitBranch', category: 'icon' },
  '237:878': { name: 'Refresh', category: 'icon' },
  '237:881': { name: 'ExternalLink', category: 'icon' },
  '237:884': { name: 'Lock', category: 'icon' },
  '237:888': { name: 'History', category: 'icon' },
  '237:891': { name: 'CheckCircle', category: 'icon' },
  '237:895': { name: 'XCircle', category: 'icon' },
  '237:899': { name: 'Bell', category: 'icon' },
  '237:902': { name: 'ChevronDown', category: 'icon' },
  '237:905': { name: 'ChevronRight', category: 'icon' },
  '237:908': { name: 'GripVertical', category: 'icon' },
  '237:916': { name: 'Link', category: 'icon' },
  '237:919': { name: 'Eye', category: 'icon' },
  '237:923': { name: 'Layers', category: 'icon' },
  '237:926': { name: 'Settings', category: 'icon' },
  '229:21': { name: 'PageHeader', category: 'product' },
  '229:40': { name: 'WorkspaceSwitcher', category: 'product' },
  '229:59': { name: 'CommandPalette', category: 'product' },
  '229:78': { name: 'NavigationItem', category: 'product' },
  '229:91': { name: 'ProjectCard', category: 'product' },
  '229:110': { name: 'EpicCard', category: 'product' },
  '229:135': { name: 'FeatureCard', category: 'product' },
  '229:148': { name: 'KanbanColumn', category: 'product' },
  '229:179': { name: 'TaskItem', category: 'product' },
  '229:204': { name: 'CriterionItem', category: 'product' },
  '229:223': { name: 'DependencyGroup', category: 'product' },
  '229:242': { name: 'FilterBar', category: 'product' },
  '229:261': { name: 'FeatureOverview', category: 'product' },
  '229:280': { name: 'ProjectPlanningHome', category: 'product' },
  '229:299': { name: 'RuleCard', category: 'product' },
  '229:318': { name: 'EvaluationSnapshot', category: 'product' },
  '229:337': { name: 'RuleAction', category: 'product' },
  '229:356': { name: 'DecisionCard', category: 'product' },
  '229:369': { name: 'RevisionHistory', category: 'product' },
  '229:388': { name: 'InvariantCard', category: 'product' },
  '229:407': { name: 'RepositoryCard', category: 'product' },
  '229:426': { name: 'ContextPackageCard', category: 'product' },
  '229:439': { name: 'ReportField', category: 'product' },
  '229:458': { name: 'ProvenanceNotice', category: 'product' },
  '229:471': { name: 'TrustDisclosure', category: 'product' },
  '229:490': { name: 'DownloadAction', category: 'product' },
  '229:515': { name: 'VerificationSummary', category: 'product' },
  '229:534': { name: 'ReleaseGate', category: 'product' },
};
function fixture() {
  const rows = Object.entries(canonical).map(([figmaNodeId, { name, category }]) => {
    const component = name === 'ButtonSize' ? 'Button' : name.replace('Tab/Tabs', 'Tabs');
    const owner =
      category === 'core'
        ? `packages/ui/src/components/actions/${component}/`
        : category === 'icon'
          ? `packages/icons/src/icons/${component}/`
          : 'apps/web/src/features/planning/components/';
    const mapping = (target) => ({ target, current: [] });
    return {
      category,
      figmaNodeId,
      figmaName: name,
      owner,
      component: { name: component, ...mapping(`${owner}${component}.tsx`) },
      publicApi: mapping(
        name === 'ButtonSize' ? '@forge-org/ui#ButtonProps.size' : `@forge-org/ui#${component}`,
      ),
      styles: mapping(`${owner}${component}.module.css`),
      tests: mapping(`${owner}${component}.test.tsx`),
      componentHost: {
        id: `${category}-${figmaNodeId.replace(':', '-')}`,
        status: 'PLANNED',
        source: null,
      },
      variants: [],
      states: [],
      implementationStatus: 'NOT_IMPLEMENTED',
      visualReviewStatus: 'NOT_HUMAN_REVIEWED',
      ...(name === 'ButtonSize'
        ? { integration: { component: 'Button', prop: 'size', implemented: false } }
        : {}),
    };
  });
  return { schemaVersion: 1, inventory: rows, codeOnlyComponents: [] };
}
function invalid(change, pattern) {
  const registry = fixture();
  change(registry);
  assert.ok(validateParity(registry).some((error) => pattern.test(error)));
}
test('accepts complete planned inventory without requiring future files', () => {
  assert.deepEqual(validateParity(fixture()), []);
});
test('validates the checked-in canonical inventory', () => {
  const registry = JSON.parse(
    readFileSync(new URL('../../docs/design/design-system-parity.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(validateParity(registry), []);
});
test('rejects missing, blank and duplicate node IDs', () => {
  invalid((r) => r.inventory.pop(), /100|missing/);
  invalid((r) => delete r.inventory[0].figmaNodeId, /figmaNodeId/);
  invalid((r) => (r.inventory[0].figmaNodeId = ''), /figmaNodeId/);
  invalid((r) => (r.inventory[1].figmaNodeId = r.inventory[0].figmaNodeId), /duplicate/);
});
test('rejects replacement IDs even when counts remain correct', () => {
  invalid((r) => (r.inventory[0].figmaNodeId = '999:999'), /unknown|missing/);
});
test('rejects category count and canonical category/name drift', () => {
  invalid((r) => (r.inventory[0].category = 'icon'), /core.*37|category/);
  invalid((r) => (r.inventory[0].category = 'other'), /category/);
  invalid((r) => (r.inventory[0].figmaName = 'Other'), /name/);
});
test('rejects missing or empty required mappings', () => {
  for (const field of [
    'owner',
    'component',
    'publicApi',
    'styles',
    'tests',
    'componentHost',
    'variants',
    'states',
    'implementationStatus',
    'visualReviewStatus',
  ]) {
    invalid((r) => delete r.inventory[0][field], new RegExp(field));
  }
  for (const field of ['component', 'publicApi', 'styles', 'tests']) {
    invalid((r) => (r.inventory[0][field].target = ''), /target/);
    invalid((r) => (r.inventory[0][field].current = 'planned'), /current/);
  }
  invalid((r) => (r.inventory[0].owner = ' '), /owner/);
});
test('rejects unknown statuses and visual certification', () => {
  invalid((r) => (r.inventory[0].implementationStatus = 'DONE'), /implementationStatus/);
  invalid((r) => (r.inventory[0].visualReviewStatus = 'PASS'), /visualReviewStatus/);
  invalid((r) => (r.inventory[0].componentHost.status = 'DONE'), /componentHost/);
});
test('host IDs must be non-empty and unique including planned previews', () => {
  invalid((r) => (r.inventory[0].componentHost.id = ' '), /preview ID/);
  invalid(
    (r) => (r.inventory[1].componentHost.id = r.inventory[0].componentHost.id),
    /duplicate.*preview/,
  );
});
test('ButtonSize must integrate with Button directory and size API', () => {
  invalid((r) => (r.inventory[1].component.name = 'ButtonSize'), /ButtonSize/);
  invalid((r) => (r.inventory[1].owner += 'ButtonSize/'), /ButtonSize/);
  invalid((r) => (r.inventory[1].publicApi.target = '@forge-org/ui#ButtonSize'), /ButtonSize/);
  invalid((r) => delete r.inventory[1].integration, /ButtonSize/);
  invalid((r) => (r.inventory[1].integration.prop = 'variant'), /ButtonSize/);
  invalid((r) => (r.inventory[1].component.target += 'Size'), /ButtonSize/);
});
test('rejects malformed registry and source variants', () => {
  assert.ok(validateParity(null).length > 0);
  invalid((r) => (r.inventory = {}), /inventory/);
  invalid((r) => (r.inventory[0].variants = ['guessed']), /variants/);
  invalid((r) => (r.inventory[0].states = [null]), /states/);
});
