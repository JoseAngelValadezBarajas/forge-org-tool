import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Frozen brief inventory: counts alone cannot detect substituted nodes.
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
const counts = { core: 37, icon: 35, product: 28 };
const implementationStatuses = new Set(['IMPLEMENTED', 'PARTIAL', 'NOT_IMPLEMENTED']);
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Check registry contracts without requiring future component files to exist. */
export function validateParity(registry, { root = repositoryRoot } = {}) {
  if (!record(registry) || !Array.isArray(registry.inventory))
    return ['inventory must be an array on a registry object'];
  const errors = [];
  if (registry.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Array.isArray(registry.codeOnlyComponents))
    errors.push('codeOnlyComponents must be separate');
  const rows = registry.inventory;
  if (rows.length !== 100) errors.push('inventory must contain exactly 100 rows');
  const ids = new Set();
  const previews = new Set();
  const checkCurrentPath = (reference, label, expectedType = 'file') => {
    const path = reference.split('#', 1)[0];
    const absolutePath = resolve(root, path);
    const pathFromRoot = relative(root, absolutePath);
    if (
      !path ||
      pathFromRoot === '..' ||
      pathFromRoot.startsWith(`..${sep}`) ||
      isAbsolute(pathFromRoot) ||
      !existsSync(absolutePath) ||
      (expectedType === 'directory' && !statSync(absolutePath).isDirectory()) ||
      (expectedType === 'file' && !statSync(absolutePath).isFile())
    ) {
      errors.push(`${label} current path does not resolve to a ${expectedType}: ${reference}`);
    }
  };
  for (const [index, row] of rows.entries()) {
    const label = `inventory[${index}]`;
    if (!record(row)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (!nonempty(row.figmaNodeId)) errors.push(`${label}.figmaNodeId is required`);
    else {
      if (ids.has(row.figmaNodeId)) errors.push(`${label} duplicate figmaNodeId`);
      ids.add(row.figmaNodeId);
      const expected = canonical[row.figmaNodeId];
      if (!expected) errors.push(`${label} unknown figmaNodeId`);
      else {
        if (row.category !== expected.category)
          errors.push(`${label} category must be ${expected.category}`);
        if (row.figmaName !== expected.name)
          errors.push(`${label} canonical name must be ${expected.name}`);
      }
    }
    if (!nonempty(row.owner)) errors.push(`${label}.owner is required`);
    else if (row.componentHost?.status === 'AVAILABLE' || row.component?.current?.length)
      checkCurrentPath(row.owner, `${label}.owner`, 'directory');
    for (const field of ['component', 'publicApi', 'styles', 'tests']) {
      const mapping = row[field];
      if (!record(mapping)) {
        errors.push(`${label}.${field} mapping is required`);
        continue;
      }
      if (!nonempty(mapping.target)) errors.push(`${label}.${field}.target is required`);
      if (!Array.isArray(mapping.current) || !mapping.current.every(nonempty))
        errors.push(`${label}.${field}.current must be a string array`);
      else
        mapping.current.forEach((reference) =>
          checkCurrentPath(reference, `${label}.${field}`, 'file'),
        );
    }
    if (!nonempty(row.component?.name)) errors.push(`${label}.component.name is required`);
    if (!implementationStatuses.has(row.implementationStatus))
      errors.push(`${label}.implementationStatus is invalid`);
    if (row.visualReviewStatus !== 'NOT_HUMAN_REVIEWED')
      errors.push(`${label}.visualReviewStatus must be NOT_HUMAN_REVIEWED`);
    if (
      !Array.isArray(row.variants) ||
      !row.variants.every(
        (v) =>
          record(v) &&
          nonempty(v.figmaNodeId) &&
          nonempty(v.name) &&
          Number.isFinite(v.width) &&
          v.width > 0 &&
          Number.isFinite(v.height) &&
          v.height > 0,
      )
    )
      errors.push(`${label}.variants must contain source IDs, names and positive dimensions`);
    if (!Array.isArray(row.states) || !row.states.every(nonempty))
      errors.push(`${label}.states must be a string array`);
    const host = row.componentHost;
    if (!record(host)) errors.push(`${label}.componentHost is required`);
    else {
      if (!nonempty(host.id)) errors.push(`${label} preview ID must be non-empty`);
      else {
        if (previews.has(host.id)) errors.push(`${label} duplicate host preview ID`);
        previews.add(host.id);
      }
      if (!['AVAILABLE', 'PLANNED'].includes(host.status))
        errors.push(`${label}.componentHost status is invalid`);
      if (host.status === 'AVAILABLE' && !nonempty(host.source))
        errors.push(`${label}.componentHost source required for AVAILABLE`);
      else if (host.status === 'AVAILABLE')
        checkCurrentPath(host.source, `${label}.componentHost`, 'file');
      if (host.status === 'PLANNED' && host.source !== null)
        errors.push(`${label}.componentHost planned source must be null`);
    }
    if (Array.isArray(row.relatedImplementation)) {
      for (const related of row.relatedImplementation) {
        if (!record(related)) continue;
        for (const field of ['path', 'tests', 'styles']) {
          if (nonempty(related[field]))
            checkCurrentPath(related[field], `${label}.relatedImplementation.${field}`, 'file');
        }
      }
    }
  }
  for (const [category, count] of Object.entries(counts)) {
    if (rows.filter((row) => row?.category === category).length !== count)
      errors.push(`${category} category must contain ${count} rows`);
  }
  for (const id of Object.keys(canonical))
    if (!ids.has(id)) errors.push(`missing canonical figmaNodeId ${id}`);
  for (const [index, component] of (registry.codeOnlyComponents ?? []).entries()) {
    const label = `codeOnlyComponents[${index}]`;
    if (!record(component)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (!nonempty(component.name)) errors.push(`${label}.name is required`);
    if (!nonempty(component.source)) errors.push(`${label}.source is required`);
    else checkCurrentPath(component.source, `${label}.source`, 'file');
    if (!nonempty(component.publicApi)) errors.push(`${label}.publicApi is required`);
    if (component.visualReviewStatus !== 'NOT_HUMAN_REVIEWED')
      errors.push(`${label}.visualReviewStatus must be NOT_HUMAN_REVIEWED`);
  }
  const button = rows.find((row) => row?.figmaNodeId === '173:27');
  const sizes = rows.find((row) => row?.figmaNodeId === '206:690');
  if (
    sizes &&
    (sizes.component?.name !== 'Button' ||
      sizes.owner !== button?.owner ||
      sizes.component?.target !== button?.component?.target ||
      sizes.publicApi?.target !== '@forge-org/ui#ButtonProps.size' ||
      sizes.integration?.component !== 'Button' ||
      sizes.integration?.prop !== 'size' ||
      typeof sizes.integration?.implemented !== 'boolean' ||
      (sizes.integration?.implemented === false &&
        sizes.implementationStatus !== 'NOT_IMPLEMENTED'))
  ) {
    errors.push('ButtonSize must integrate into Button directory and ButtonProps.size API');
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const path =
      process.argv[2] ?? new URL('../../docs/design/design-system-parity.json', import.meta.url);
    const errors = validateParity(JSON.parse(readFileSync(path, 'utf8')));
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else
      console.log(
        'Design-system parity: 100 canonical entries valid (core 37, icon 35, product 28).',
      );
  } catch (error) {
    console.error(`Design-system parity: ${error.message}`);
    process.exitCode = 1;
  }
}
