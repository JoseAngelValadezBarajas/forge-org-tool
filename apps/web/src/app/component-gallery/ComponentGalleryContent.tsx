import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Breadcrumbs,
  Card,
  Checkbox,
  CodeLabel,
  Dialog,
  Divider,
  EmptyState,
  ErrorState,
  FilePicker,
  FormField,
  FormActions,
  IconButton,
  Input,
  KeyValueRow,
  LoadingState,
  MenuItem,
  MetricCard,
  MultiSelect,
  Popover,
  Progress,
  Radio,
  RecordRow,
  SearchField,
  SectionHeader,
  Select,
  Skeleton,
  StatePanel,
  StepperStep,
  StatusChip,
  Switch,
  Table,
  TableRow,
  Tabs,
  Textarea,
  TextInput,
  Toast,
  Tooltip,
} from '@forge-org/ui';
import { Plus } from '@forge-org/icons';
import { OrganizationEmptyState } from '../../features/organization';
import { CommandPalette, NavigationItem, PageHeader, WorkspaceSwitcher } from '../shell';
import {
  CriterionItem,
  DependencyGroup,
  EpicCard,
  FeatureCard,
  FeatureOverview,
  FilterBar,
  KanbanColumn,
  ProjectCard,
  ProjectPlanningHome,
  TaskItem,
} from '../../features/planning';
import {
  DecisionCard,
  EvaluationSnapshot,
  InvariantCard,
  RevisionHistory,
  RuleAction,
  RuleCard,
} from '../../features/readiness';
import { RepositoryCard } from '../../features/repositories';
import { ContextPackageCard } from '../../features/context';
import { ProvenanceNotice, ReportField } from '../../features/workbench';
import {
  DownloadAction,
  ReleaseGate,
  TrustDisclosure,
  VerificationSummary,
} from '../../features/delivery';
import { useTheme } from '../theme';
import styles from './ComponentGallery.module.css';
import parity from '../../../../../docs/design/design-system-parity.json';
import { catalogFamilyById, catalogSections } from './catalog/inventory';
import { catalogStatus } from './catalog/parity-status';
import { foundationCatalog } from './catalog/foundations';
import type { CatalogItem, CatalogSection } from './catalog/types';
import {
  previewContextPackage,
  previewCriterion,
  previewEpic,
  previewFeature,
  previewObservation,
  previewProject,
  previewReadiness,
  previewRepository,
  previewTask,
} from './previews/fixtures';
import { TokenPreview } from './previews/foundations';
import { IconCatalogPreview } from './previews/icons';
import { ComponentGalleryLayout } from './shell/ComponentGalleryLayout';

const catalog: CatalogItem[] = [
  ...foundationCatalog,
  {
    id: 'button',
    name: 'Button',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:27 Button',
    variants: 'primary, secondary, ghost, danger',
    states: 'default, hover, pressed, focus-visible, disabled, loading',
    accessibility: 'Native button semantics; loading is disabled and aria-busy.',
    deviations:
      '40px implementation vs Figma 36/38px references; Dark pressed label uses white for 5.41:1 contrast instead of the 3.44:1 Figma pair. Visual review is pending.',
  },
  {
    id: 'card',
    name: 'Card',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:65 Card',
    variants: 'default, elevated; typed semantic root',
    states: 'default',
    accessibility: 'Neutral div root with typed semantic option.',
    deviations:
      'Visual review is pending; Default and Elevated container variants are implemented.',
  },
  {
    id: 'input',
    name: 'Input',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'text-compatible native input',
    states: 'default, focus-visible, disabled',
    accessibility: 'Native label and input semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'select',
    name: 'Select',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'native select contract',
    states: 'default, focus-visible, disabled',
    accessibility: 'Native select semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'textarea',
    name: 'Textarea',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'native textarea contract',
    states: 'default, focus-visible, disabled',
    accessibility: 'Native textarea semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'native checkbox contract',
    states: 'default, focus-visible, disabled',
    accessibility: 'Native checkbox semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'form-field',
    name: 'FormField',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'label, hint, error',
    states: 'default, invalid',
    accessibility: 'Associates labels and messages with controls.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'search-field',
    name: 'SearchField',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'search input',
    states: 'default, focus-visible, disabled',
    accessibility: 'Native searchbox semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'metric-card',
    name: 'MetricCard',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'label, value, detail',
    states: 'default',
    accessibility: 'Text remains available without color dependence.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'badge',
    name: 'Badge',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'neutral, accent, info',
    states: 'default',
    accessibility: 'Visible text label.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'alert',
    name: 'Alert',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'info, success, warning, danger',
    states: 'default',
    accessibility: 'Uses alert/status semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'empty-state',
    name: 'EmptyState',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'title, description, action',
    states: 'default',
    accessibility: 'Action slot remains keyboard accessible.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'loading-state',
    name: 'LoadingState',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'message',
    states: 'busy',
    accessibility: 'Busy status is announced.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'error-state',
    name: 'ErrorState',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'message, retry',
    states: 'error',
    accessibility: 'Alert semantics and retry action.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'progress',
    name: 'Progress',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'determinate',
    states: 'progress',
    accessibility: 'Native progressbar semantics.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'status-chip',
    name: 'StatusChip',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:40 StatusChip',
    variants: 'neutral, success, warning, danger, info, reported; Accent is an additional API tone',
    states: 'default',
    accessibility: 'Status text is always rendered; tone is supplementary.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'section-header',
    name: 'SectionHeader',
    section: 'Generic shared compositions',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '177:183 SectionHeader',
    variants: 'eyebrow, action slot, counter slot',
    states: 'default',
    accessibility: 'Uses a heading and named action region when supplied.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'organization-empty-state',
    name: 'OrganizationEmptyState',
    section: 'Product-specific components',
    owner: 'apps/web/src/features/organization',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma:
      'Closest related product screen: Workspace Home 4:32; exact page-20 empty-state master unconfirmed',
    variants: 'empty state',
    states: 'not implemented',
    accessibility: 'Uses shared primitives and a disabled action with an explicit label.',
    deviations:
      'No exact native page-20 master confirmed; the related screen is not an exact empty-state match.',
  },
  {
    id: 'icon-library',
    name: 'Icon library',
    section: 'Icon library',
    owner: '@forge-org/icons',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: 'Page 19 / 35 icon masters',
    variants: '35 named SVG exports, 24px default, configurable size and currentColor',
    states: 'decorative by default; optional accessible title',
    accessibility: 'Decorative icons are aria-hidden; titled icons expose an accessible name.',
    deviations: 'Original SVG path geometry; human Figma visual review is pending.',
  },
];

const canonicalByHostId = new Map(parity.inventory.map((entry) => [entry.componentHost.id, entry]));
const accessibilityNotes: Record<string, string> = {
  ButtonSize: 'Native button semantics; loading and disabled states remain non-activatable.',
  IconButton:
    'Requires an accessible name on the button; decorative icons are hidden from assistive technology.',
  MultiSelect: 'Native multiple-select semantics; provide a visible or programmatic label.',
  FilePicker: 'Native file input semantics; provide a visible or programmatic label.',
  FormActions: 'Contains normal keyboard-operable controls in a layout-only grouping.',
  Radio: 'Use a fieldset and legend to announce the radio group.',
  Switch: 'Native checkbox semantics with switch role and accessible name.',
  'Tab/Tabs': 'Implements tablist, tab, tabpanel relationships and arrow-key navigation.',
  Breadcrumbs: 'Uses a labeled navigation landmark and marks the current page.',
  MenuItem: 'Native button behavior with menuitem role; place inside a labeled menu.',
  StepperStep: 'Ordered-list step semantics with aria-current on the active step.',
  StatePanel: 'Loading and error states announce status; the other states remain informational.',
  Tooltip: 'Associates the trigger with tooltip content using aria-describedby.',
  Skeleton: 'Decorative loading shapes are hidden from assistive technology.',
  Toast: 'Uses a polite status region or assertive alert according to tone.',
  RecordRow: 'Uses a row header and table-cell structure; place inside a table body.',
  KeyValueRow: 'Uses definition-term/value semantics; place inside a description list.',
  TableRow: 'Uses column headers with scope when rendering a header row.',
  Table: 'Provides a caption, scoped headers, and an explicit empty state.',
  Dialog: 'Uses native dialog semantics and programmatically associated title/description.',
  Popover: 'Uses the native details/summary disclosure interaction.',
  Divider: 'Exposes separator orientation unless explicitly marked decorative.',
  CodeLabel: 'Uses the semantic code element without conveying meaning through color.',
};
for (const item of catalog) {
  const entry = canonicalByHostId.get(item.id);
  if (!entry || entry.category !== 'core') continue;
  if (entry.figmaName === 'TextInput') item.name = 'TextInput';
  item.status = catalogStatus(entry.implementationStatus);
  item.figma = entry.figmaNodeId;
  item.variants = entry.variants.map((variant) => variant.name).join('; ') || 'Default contract';
  item.states = entry.states.join(', ') || 'No State axis documented';
  item.accessibility = accessibilityNotes[entry.figmaName] ?? item.accessibility;
  item.deviations = `${entry.implementationNotes} Human Figma visual review pending.`;
}

const catalogIds = new Set(catalog.map((item) => item.id));
const coreSections: Record<string, CatalogSection> = {
  ButtonSize: 'Core UI primitives',
  IconButton: 'Core UI primitives',
  MultiSelect: 'Core UI primitives',
  FilePicker: 'Core UI primitives',
  FormActions: 'Generic shared compositions',
  Radio: 'Core UI primitives',
  Switch: 'Core UI primitives',
  'Tab/Tabs': 'Core UI primitives',
  Breadcrumbs: 'Core UI primitives',
  MenuItem: 'Core UI primitives',
  StepperStep: 'Core UI primitives',
  StatePanel: 'Generic shared compositions',
  Tooltip: 'Core UI primitives',
  Skeleton: 'Generic shared compositions',
  Toast: 'Generic shared compositions',
  RecordRow: 'Generic shared compositions',
  KeyValueRow: 'Generic shared compositions',
  TableRow: 'Generic shared compositions',
  Table: 'Generic shared compositions',
  Dialog: 'Core UI primitives',
  Popover: 'Core UI primitives',
  Divider: 'Generic shared compositions',
  CodeLabel: 'Generic shared compositions',
};
catalog.push(
  ...parity.inventory
    .filter((entry) => entry.category === 'core' && !catalogIds.has(entry.componentHost.id))
    .map((entry) => ({
      id: entry.componentHost.id,
      name: entry.figmaName === 'Tab/Tabs' ? 'Tabs' : entry.figmaName,
      section: coreSections[entry.figmaName] ?? 'Generic shared compositions',
      owner: '@forge-org/ui',
      status: catalogStatus(entry.implementationStatus),
      figma: entry.figmaNodeId,
      variants: entry.variants.map((variant) => variant.name).join('; ') || 'Default contract',
      states: entry.states.join(', ') || 'No State axis documented',
      accessibility:
        accessibilityNotes[entry.figmaName] ??
        'See the public contract and colocated accessibility tests.',
      deviations: `${entry.implementationNotes} Human Figma visual review pending.`,
    })),
);

const productAccessibility: Record<string, string> = {
  'page-header':
    'Uses a named header landmark; breadcrumbs retain their own labeled navigation landmark.',
  'workspace-switcher':
    'The editable state uses a labeled native select; read-only state is announced as status.',
  'command-palette':
    'The open palette is a labeled modal dialog with search, Escape close, and focus restoration.',
  'navigation-item':
    'Enabled entries use NavLink semantics and aria-current; Disabled is a non-link aria-disabled item.',
  'project-card': 'Project title remains a real route link; status is paired with text.',
  'epic-card': 'Progress is presented with a text status, not color alone.',
  'feature-card': 'Feature title is a route link; status and priority retain text labels.',
  'kanban-column': 'Each column is a labeled section with an explicit empty state.',
  'task-item': 'Status and movement controls have task-specific accessible names.',
  'criterion-item': 'Criterion state is conveyed by a text status chip.',
  'dependency-group':
    'The directed dependency is a labeled group with explicit text for its state.',
  'filter-bar': 'The filter region is labeled and result counts are announced politely.',
  'feature-overview': 'Readiness outcome and stale evaluation are conveyed with text.',
  'project-planning-home': 'Composes child content within a named project-planning section.',
  'rule-card': 'Rule identifier, result, and explanation remain text content.',
  'evaluation-snapshot': 'Fingerprint and timestamp are grouped with an explicit freshness label.',
  'rule-action': 'Uses a native button and disables it for archived/unavailable cases.',
  'decision-card': 'Decision title, revision, and status are grouped semantically.',
  'revision-history': 'Revision entries are presented as an ordered list.',
  'invariant-card': 'Acknowledgement and current revision are stated in text.',
  'repository-card':
    'Repository metadata uses definition-list semantics and explicit source-content disclosure.',
  'context-package-card': 'Snapshot metadata is in a definition list; freshness is labeled.',
  'report-field':
    'A labeled group distinguishes HAS VALUE from EMPTY and states that reported data is not proof.',
  'provenance-notice':
    'Reported, Observed, and Unknown provenance are labeled explicitly; none implies verification by itself.',
  'trust-disclosure':
    'Disclosure is announced as a note and does not imply a release or deployment.',
  'download-action':
    'Ready downloads are links; pending and failed outcomes use status/alert roles.',
  'verification-summary': 'Outcome, fingerprint, stale state, and blockers are visible as text.',
  'release-gate': 'Gate outcome is visible text; status is not represented by color alone.',
};

catalog.push(
  ...parity.inventory
    .filter((entry) => entry.category === 'product')
    .map((entry) => ({
      id: entry.componentHost.id,
      name: entry.figmaName,
      section: 'Product-specific components' as const,
      owner: entry.owner,
      status: catalogStatus(
        entry.implementationStatus === 'IMPLEMENTED' ? 'IMPLEMENTED' : entry.implementationStatus,
      ),
      figma: entry.figmaNodeId,
      variants: entry.variants.map((variant) => variant.name).join('; ') || 'Default contract',
      states: entry.states.join(', ') || 'No state axis documented',
      accessibility:
        productAccessibility[entry.componentHost.id] ??
        'See feature-owned public component contract.',
      deviations: `${entry.implementationNotes} Human visual review remains NOT_HUMAN_REVIEWED.`,
      hostStatus: 'AVAILABLE' as const,
    })),
);

function CatalogMeta({ item }: { item: CatalogItem }) {
  return (
    <dl className={styles.meta}>
      <div>
        <dt>Catalog family</dt>
        <dd>{catalogFamilyById.get(item.id) ?? 'Shared components'}</dd>
      </div>
      <div>
        <dt>Owner</dt>
        <dd>{item.owner}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>
          <StatusChip tone={item.status === 'NOT_IMPLEMENTED' ? 'warning' : 'accent'}>
            {item.status}
          </StatusChip>
        </dd>
      </div>
      {item.hostStatus && (
        <div>
          <dt>Host preview</dt>
          <dd>{item.hostStatus}</dd>
        </div>
      )}
      <div>
        <dt>Figma</dt>
        <dd>{item.figma}</dd>
      </div>
      <div>
        <dt>Variants</dt>
        <dd>{item.variants}</dd>
      </div>
      <div>
        <dt>States</dt>
        <dd>{item.states}</dd>
      </div>
      <div>
        <dt>Accessibility</dt>
        <dd>{item.accessibility}</dd>
      </div>
      <div>
        <dt>Known deviation</dt>
        <dd>{item.deviations}</dd>
      </div>
    </dl>
  );
}

function ComponentPreview({
  item,
  onIncrement,
  count,
}: {
  item: CatalogItem;
  onIncrement: () => void;
  count: number;
}) {
  switch (item.id) {
    case 'tokens':
      return <TokenPreview />;
    case 'button':
      return (
        <Card>
          <div className={styles.previewRow}>
            <Button onClick={onIncrement}>Increment {count}</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className={styles.previewRow} data-component-id="button-size">
            <Button size="small">Small</Button>
            <Button size="medium" variant="secondary">
              Medium
            </Button>
            <Button size="large" variant="secondary">
              Large
            </Button>
          </div>
        </Card>
      );
    case 'button-size':
      return (
        <Card>
          <div className={styles.previewRow}>
            <Button size="small">Small</Button>
            <Button size="medium" variant="secondary">
              Medium
            </Button>
            <Button size="large" variant="secondary">
              Large
            </Button>
          </div>
        </Card>
      );
    case 'card':
      return (
        <div className={styles.previewRow}>
          <Card>
            <strong>Default</strong>
            <p>Neutral surface</p>
          </Card>
          <Card variant="elevated">
            <strong>Elevated</strong>
            <p>Raised surface</p>
          </Card>
        </div>
      );
    case 'input':
      return (
        <Card>
          <label htmlFor="host-input">Input preview</label>
          <TextInput id="host-input" placeholder="Type a value" />
        </Card>
      );
    case 'select':
      return (
        <div className={styles.previewStack}>
          <Card>
            <FormField label="Default select">
              <Select defaultValue="one">
                <option value="one">Option one</option>
                <option value="two">Option two</option>
              </Select>
            </FormField>
          </Card>
          <Card>
            <FormField label="Invalid select" error="Choose an available option.">
              <Select aria-invalid="true" defaultValue="">
                <option value="">Choose…</option>
                <option value="one">Option one</option>
              </Select>
            </FormField>
          </Card>
          <Card>
            <FormField label="Disabled select" disabled>
              <Select disabled defaultValue="one">
                <option value="one">Option one</option>
              </Select>
            </FormField>
          </Card>
        </div>
      );
    case 'textarea':
      return (
        <div className={styles.previewStack}>
          <Card>
            <FormField label="Default textarea">
              <Textarea placeholder="Type details" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Invalid textarea" error="Add a short description.">
              <Textarea aria-invalid="true" defaultValue="" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Disabled textarea" disabled>
              <Textarea disabled defaultValue="Read-only context" />
            </FormField>
          </Card>
        </div>
      );
    case 'checkbox':
      return (
        <Card>
          <div className={styles.previewStack}>
            <label className={styles.previewRow} htmlFor="host-checkbox-unchecked">
              <Checkbox id="host-checkbox-unchecked" /> Unchecked
            </label>
            <label className={styles.previewRow} htmlFor="host-checkbox-checked">
              <Checkbox id="host-checkbox-checked" defaultChecked /> Checked
            </label>
            <label className={styles.previewRow} htmlFor="host-checkbox-indeterminate">
              <Checkbox id="host-checkbox-indeterminate" indeterminate /> Indeterminate
            </label>
            <label className={styles.previewRow} htmlFor="host-checkbox-disabled">
              <Checkbox id="host-checkbox-disabled" disabled /> Disabled
            </label>
          </div>
        </Card>
      );
    case 'form-field':
      return (
        <div className={styles.previewStack}>
          <Card>
            <FormField label="Field label" hint="Helpful hint">
              <Input placeholder="Field value" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Required field" required hint="Required for this example">
              <Input placeholder="Field value" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Invalid field" error="Enter a valid value.">
              <Input aria-invalid="true" defaultValue="Invalid" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Disabled field" disabled>
              <Input disabled defaultValue="Unavailable" />
            </FormField>
          </Card>
        </div>
      );
    case 'search-field':
      return (
        <div className={styles.previewStack}>
          <Card>
            <SearchField aria-label="Empty search" placeholder="Search records" />
          </Card>
          <Card>
            <SearchField aria-label="Search with query" defaultValue="evidence" />
          </Card>
          <Card>
            <SearchField aria-label="Disabled search" disabled defaultValue="Unavailable" />
          </Card>
        </div>
      );
    case 'metric-card':
      return <MetricCard label="Projects" value="12" detail="active records" />;
    case 'badge':
      return (
        <div className={styles.previewRow}>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="info">Info</Badge>
        </div>
      );
    case 'alert':
      return (
        <div className={styles.previewStack}>
          <Alert
            tone="info"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
          <Alert
            tone="warning"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
          <Alert
            tone="error"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
          <Alert
            tone="success"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
        </div>
      );
    case 'empty-state':
      return (
        <EmptyState
          title="No records"
          description="A deterministic empty state preview."
          actions={<Button variant="secondary">Create record</Button>}
        />
      );
    case 'loading-state':
      return <LoadingState label="Loading preview" />;
    case 'error-state':
      return (
        <ErrorState
          title="Unable to load preview"
          actions={<Button variant="secondary">Retry</Button>}
        />
      );
    case 'progress':
      return (
        <div className={styles.previewStack}>
          <Progress value={0} max={100} label="Starting" presentation="panel" />
          <Progress value={64} max={100} label="In progress" presentation="panel" />
          <Progress value={100} max={100} label="Complete" presentation="panel" />
        </div>
      );
    case 'status-chip':
      return (
        <Card>
          <div className={styles.previewRow}>
            <StatusChip>Neutral</StatusChip>
            <StatusChip tone="accent">Accent</StatusChip>
            <StatusChip tone="success">Success</StatusChip>
            <StatusChip tone="warning">Warning</StatusChip>
            <StatusChip tone="danger">Danger</StatusChip>
            <StatusChip tone="info">Info</StatusChip>
            <StatusChip tone="reported">Reported</StatusChip>
          </div>
        </Card>
      );
    case 'section-header':
      return (
        <Card>
          <SectionHeader
            headingLevel={3}
            eyebrow="Shared composition"
            title="SectionHeader"
            counter={12}
            actions={<Button variant="ghost">Action</Button>}
          />
        </Card>
      );
    case 'icon-button':
      return (
        <div className={styles.previewRow}>
          <IconButton aria-label="Add item">
            <Plus size={18} />
          </IconButton>
          <IconButton aria-label="Loading item" loading>
            <Plus size={18} />
          </IconButton>
          <IconButton aria-label="Unavailable item" disabled>
            <Plus size={18} />
          </IconButton>
        </div>
      );
    case 'multi-select':
      return (
        <div className={styles.previewStack}>
          <MultiSelect
            presentation="checkboxList"
            label="Relevant evidence"
            name="host-evidence"
            defaultValue={['criteria', 'build']}
            options={[
              { value: 'criteria', label: 'Criteria evidence' },
              { value: 'build', label: 'Build report' },
            ]}
          />
          <MultiSelect
            presentation="checkboxList"
            label="Relevant evidence"
            options={[]}
            emptyMessage="No saved records available."
          />
        </div>
      );
    case 'file-picker':
      return (
        <div className={styles.previewStack}>
          <FilePicker
            title="Choose JSON file"
            description="Browse locally for a JSON file."
            metadata=".json · Max 8 MiB"
            accept="application/json,.json"
          />
          <FilePicker
            title="Choose JSON file"
            description="A selected file is handled by the consuming feature."
            metadata=".json · Max 8 MiB"
            accept="application/json,.json"
            state="selected"
          />
          <FilePicker
            title="Choose JSON file"
            description="The selected file exceeds the feature's configured limit."
            metadata=".json · Max 8 MiB"
            accept="application/json,.json"
            state="error"
          />
        </div>
      );
    case 'form-actions':
      return (
        <div className={styles.previewStack}>
          <FormActions onCancel={() => undefined} onSave={() => undefined} />
          <FormActions state="saving" />
          <FormActions state="readOnly" />
        </div>
      );
    case 'radio':
      return (
        <Card>
          <fieldset className={styles.fieldset}>
            <legend>Repository access</legend>
            <label htmlFor="host-repo-access-read">
              <Radio
                id="host-repo-access-read"
                name="host-repo-access"
                value="read"
                defaultChecked
              />{' '}
              Read only
            </label>
            <label htmlFor="host-repo-access-write">
              <Radio id="host-repo-access-write" name="host-repo-access" value="write" /> Read and
              write
            </label>
            <label htmlFor="host-repo-access-disabled">
              <Radio
                id="host-repo-access-disabled"
                name="host-repo-access-disabled"
                value="none"
                disabled
              />{' '}
              Unavailable
            </label>
          </fieldset>
        </Card>
      );
    case 'switch':
      return (
        <Card>
          <div className={styles.previewStack}>
            <label className={styles.previewRow} htmlFor="host-switch-off">
              <Switch id="host-switch-off" /> Off
            </label>
            <label className={styles.previewRow} htmlFor="host-switch-on">
              <Switch id="host-switch-on" defaultChecked /> On
            </label>
            <label className={styles.previewRow} htmlFor="host-switch-disabled">
              <Switch id="host-switch-disabled" disabled /> Disabled
            </label>
          </div>
        </Card>
      );
    case 'tabs':
      return (
        <Card>
          <Tabs
            label="Preview tabs"
            tabs={[
              { id: 'overview', label: 'Overview', content: <p>Overview content</p> },
              { id: 'activity', label: 'Activity', content: <p>Recent activity</p> },
              {
                id: 'unavailable',
                label: 'Unavailable',
                content: <p>Disabled tab</p>,
                disabled: true,
              },
              { id: 'settings', label: 'Settings', content: <p>Workspace settings</p> },
            ]}
          />
        </Card>
      );
    case 'breadcrumbs':
      return (
        <Card>
          <Breadcrumbs
            items={[
              { label: 'Workspace', href: '#' },
              { label: 'Project', href: '#' },
              { label: 'Feature' },
            ]}
          />
        </Card>
      );
    case 'menu-item':
      return (
        <Card>
          <div role="menu" aria-label="Example actions" className={styles.menuPreview}>
            <MenuItem onSelect={onIncrement}>Refresh data</MenuItem>
            <MenuItem destructive>Remove connection</MenuItem>
            <MenuItem disabled>Unavailable action</MenuItem>
            <MenuItem selected>Selected action</MenuItem>
          </div>
        </Card>
      );
    case 'stepper-step':
      return (
        <Card>
          <ol className={styles.stepperPreview} aria-label="Transfer steps">
            <StepperStep label="Select source" state="complete" index={1} />
            <StepperStep label="Review planning" state="current" index={2} />
            <StepperStep label="Confirm" state="upcoming" index={3} />
          </ol>
        </Card>
      );
    case 'state-panel':
      return (
        <div className={styles.previewStack}>
          <StatePanel kind="loading" title="Loading" description="Reading local metadata." />
          <StatePanel kind="empty" title="No records" description="Nothing to show yet." />
          <StatePanel
            kind="readOnly"
            title="Planning-only workspace"
            description="No repository is required."
          />
          <StatePanel kind="error" title="Unavailable" description="Could not load this view." />
        </div>
      );
    case 'tooltip':
      return (
        <Card>
          <Tooltip content="This action records a human-reported update.">
            <Button variant="secondary">What is this?</Button>
          </Tooltip>
        </Card>
      );
    case 'skeleton':
      return (
        <Card>
          <div className={styles.skeletonPreview} aria-label="Loading record preview">
            <Skeleton aria-hidden="true" kind="text" />
            <Skeleton aria-hidden="true" kind="title" />
            <Skeleton aria-hidden="true" kind="avatar" />
            <Skeleton aria-hidden="true" kind="card" />
            <Skeleton aria-hidden="true" kind="list" />
          </div>
        </Card>
      );
    case 'toast':
      return (
        <div className={styles.previewStack}>
          <Toast tone="success">Workspace settings saved.</Toast>
          <Toast tone="error">Workspace could not be saved.</Toast>
          <Toast tone="info">A new observation is available.</Toast>
        </div>
      );
    case 'record-row':
      return (
        <Card>
          <table className={styles.tablePreview}>
            <tbody>
              <RecordRow
                title="Planning review"
                metadata="FEAT-012 · reported manually"
                status={<StatusChip tone="success">Complete</StatusChip>}
              />
              <RecordRow title="Selected item" metadata="Current selection" selected />
              <RecordRow title="Read-only item" metadata="Imported context" readOnly />
            </tbody>
          </table>
        </Card>
      );
    case 'key-value-row':
      return (
        <Card>
          <dl className={styles.keyValues}>
            <KeyValueRow label="Branch" value={<CodeLabel>main</CodeLabel>} />
            <KeyValueRow label="Observation" value="Read only" muted />
          </dl>
        </Card>
      );
    case 'table-row':
      return (
        <Card>
          <table className={styles.tablePreview}>
            <tbody>
              <TableRow header cells={['Evidence', 'Scope', 'State']} />
              <TableRow cells={['Build output', 'FEAT-012', 'Observed']} />
              <TableRow warning cells={['Review record', 'FEAT-014', 'Missing']} />
            </tbody>
          </table>
        </Card>
      );
    case 'table':
      return (
        <Card>
          <div className={styles.previewStack}>
            <Table
              caption="Repository inventory"
              columns={[
                { key: 'name', label: 'Repository' },
                { key: 'branch', label: 'Branch' },
                { key: 'state', label: 'State' },
              ]}
              rows={[
                { name: 'forge-core', branch: 'main', state: 'Observed' },
                { name: 'docs-site', branch: 'Unavailable', state: 'Stale' },
              ]}
            />
            <Table
              caption="Empty repository inventory"
              columns={[{ key: 'name', label: 'Repository' }]}
              rows={[]}
              emptyMessage="No repositories available."
            />
          </div>
        </Card>
      );
    case 'dialog':
      return <DialogPreview />;
    case 'popover':
      return (
        <Card>
          <Popover open trigger="Expanded details">
            <p>Local paths remain on this device.</p>
          </Popover>
          <Popover trigger="Collapsed details">
            <p>This content is initially collapsed.</p>
          </Popover>
        </Card>
      );
    case 'divider':
      return (
        <Card>
          <p>Repository metadata</p>
          <Divider />
          <p>Last observed just now</p>
        </Card>
      );
    case 'code-label':
      return (
        <Card>
          <div className={styles.previewRow}>
            <CodeLabel>FEAT-012</CodeLabel>
            <CodeLabel>8f1c6a2d</CodeLabel>
          </div>
        </Card>
      );
    case 'organization-empty-state':
      return (
        <div className={styles.productFrame}>
          <OrganizationEmptyState />
        </div>
      );
    case 'icon-library':
      return <IconCatalogPreview />;
    default:
      return <ProductPreview item={item} />;
  }
}

type DialogPreviewVariant = 'confirm' | 'destructive' | 'busy';

function DialogPreview() {
  const [active, setActive] = useState<DialogPreviewVariant | null>(null);
  const examples: Record<
    DialogPreviewVariant,
    { title: string; description: string; body: string }
  > = {
    confirm: {
      title: 'Confirm transfer',
      description: 'No data is saved until you confirm.',
      body: 'Review the included project planning data.',
    },
    destructive: {
      title: 'Remove repository',
      description: 'This action requires deliberate confirmation.',
      body: 'This cannot be undone.',
    },
    busy: {
      title: 'Saving transfer',
      description: 'A local transaction is in progress.',
      body: 'Please wait while the local transaction completes.',
    },
  };
  const current = active ? examples[active] : undefined;

  return (
    <Card>
      <p>Open a dialog state to inspect its modal behavior.</p>
      <div className={styles.previewRow}>
        <Button onClick={() => setActive('confirm')}>Preview confirm dialog</Button>
        <Button variant="danger" onClick={() => setActive('destructive')}>
          Preview destructive dialog
        </Button>
        <Button variant="secondary" onClick={() => setActive('busy')}>
          Preview busy dialog
        </Button>
      </div>
      {active && current && (
        <Dialog
          open
          variant={active}
          title={current.title}
          description={current.description}
          onClose={() => setActive(null)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setActive(null)}>
                Close preview
              </Button>
              {active !== 'busy' && (
                <Button onClick={() => setActive(null)}>Confirm preview</Button>
              )}
            </>
          }
        >
          {current.body}
        </Dialog>
      )}
    </Card>
  );
}

function PalettePreview() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open command palette preview
      </Button>
      <CommandPalette
        open={open}
        onClose={close}
        commands={[
          { id: 'planning', label: 'Planning', onSelect: close },
          { id: 'readiness', label: 'Readiness', onSelect: close },
        ]}
      />
      <CommandPalette open={false} commands={[]} onClose={close} />
    </>
  );
}

function ProductPreview({ item }: { item: CatalogItem }) {
  let preview: ReactNode;
  switch (item.id) {
    case 'page-header':
      preview = (
        <div className={styles.previewStack}>
          <PageHeader
            title="Planning overview"
            eyebrow="FORGE / Preview workspace"
            description="A feature-owned page heading with an optional action slot."
          >
            <Button variant="secondary">Open command palette</Button>
          </PageHeader>
          <PageHeader
            title="Feature detail"
            eyebrow="FORGE / Atlas"
            breadcrumbs={[
              { label: 'Workspace', href: '/' },
              { label: 'Planning', href: '/planning/preview' },
              { label: 'Feature detail' },
            ]}
          />
        </div>
      );
      break;
    case 'workspace-switcher':
      preview = (
        <div className={styles.productStates}>
          <WorkspaceSwitcher
            value="one"
            workspaces={[
              { id: 'one', name: 'Atlas' },
              { id: 'two', name: 'Beacon' },
            ]}
            onChange={() => undefined}
          />
          <WorkspaceSwitcher value="one" currentName="Atlas" />
        </div>
      );
      break;
    case 'command-palette':
      preview = <PalettePreview />;
      break;
    case 'navigation-item':
      preview = (
        <nav aria-label="Preview product navigation" className={styles.productStates}>
          <NavigationItem to="/__components" end label="Selected route" />
          <NavigationItem to="/planning/preview" label="Other route" />
          <NavigationItem to="/planning/preview" label="Unavailable" disabled />
        </nav>
      );
      break;
    case 'project-card':
      preview = (
        <div className={styles.productStates}>
          <ProjectCard project={previewProject} workspaceId="host-workspace" />
          <ProjectCard
            project={{ ...previewProject, id: 'archived-project', status: 'archived' }}
            workspaceId="host-workspace"
          />
        </div>
      );
      break;
    case 'epic-card':
      preview = (
        <div className={styles.productStates}>
          <EpicCard epic={previewEpic} />
          <EpicCard epic={{ ...previewEpic, features: [] }} />
          <EpicCard
            epic={{
              ...previewEpic,
              features: [{ ...previewFeature, status: 'done' }],
            }}
          />
        </div>
      );
      break;
    case 'feature-card':
      preview = (
        <div className={styles.productStates}>
          <FeatureCard
            feature={{ ...previewFeature, status: 'backlog' }}
            href="/planning/host-project/host-feature"
          />
          <FeatureCard feature={previewFeature} href="/planning/host-project/host-feature" />
          <FeatureCard
            feature={{ ...previewFeature, status: 'done' }}
            href="/planning/host-project/host-feature"
            readOnly
          />
        </div>
      );
      break;
    case 'kanban-column':
      preview = (
        <div className={styles.productStates}>
          <KanbanColumn status="in_progress">
            <FeatureCard feature={previewFeature} href="/planning/host-project/host-feature" />
          </KanbanColumn>
          <KanbanColumn status="done" />
        </div>
      );
      break;
    case 'task-item':
      preview = (
        <div className={styles.productStates}>
          <TaskItem
            task={previewTask}
            onStatusChange={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
          <TaskItem
            task={previewTask}
            editing
            onStatusChange={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
          <TaskItem
            task={previewTask}
            archived
            onStatusChange={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
        </div>
      );
      break;
    case 'criterion-item':
      preview = (
        <ul className={styles.productStates}>
          <CriterionItem criterion={previewCriterion} />
          <CriterionItem criterion={{ ...previewCriterion, satisfied: true }} />
          <CriterionItem criterion={previewCriterion} editing />
          <CriterionItem criterion={previewCriterion} archived />
        </ul>
      );
      break;
    case 'dependency-group':
      preview = (
        <div className={styles.productStates}>
          <DependencyGroup blocker="API contract" blocked="UI adoption" state="Blocked" />
          <DependencyGroup blocker="Completed prerequisite" blocked="UI adoption" state="Clear" />
          <DependencyGroup blocker="Archived prerequisite" blocked="Archived task" archived />
        </div>
      );
      break;
    case 'filter-bar':
      preview = (
        <div className={styles.productStates}>
          <FilterBar>
            <SearchField aria-label="Filter planning preview" placeholder="Search planning" />
          </FilterBar>
          <FilterBar resultCount={2}>
            <SearchField aria-label="Filtered planning preview" value="Atlas" readOnly />
          </FilterBar>
          <FilterBar resultCount={0}>
            <SearchField aria-label="No results planning preview" value="missing" readOnly />
          </FilterBar>
        </div>
      );
      break;
    case 'feature-overview':
      preview = (
        <div className={styles.productStates}>
          <FeatureOverview
            result={{ ...previewReadiness, outcome: 'READY_TO_START', blockers: [] }}
          />
          <FeatureOverview result={previewReadiness} />
          <FeatureOverview result={null} />
        </div>
      );
      break;
    case 'project-planning-home':
      preview = (
        <div className={styles.productStates}>
          <ProjectPlanningHome state="Default" />
          <ProjectPlanningHome state="Empty" />
          <ProjectPlanningHome state="Archived" />
        </div>
      );
      break;
    case 'rule-card':
      preview = (
        <div className={styles.productStates}>
          <RuleCard ruleId="R01" result="PASS" explanation="Planning record is present." />
          <RuleCard ruleId="R02" result="BLOCKED" explanation="A planning input is missing." />
          <RuleCard ruleId="R03" result="UNAVAILABLE" explanation="Evaluation is unavailable." />
        </div>
      );
      break;
    case 'evaluation-snapshot':
      preview = (
        <div className={styles.productStates}>
          <EvaluationSnapshot fingerprint="sha256:preview-only" evaluatedAt="Preview only" />
          <EvaluationSnapshot
            fingerprint="sha256:saved-preview"
            evaluatedAt="Saved preview"
            state="Saved"
          />
          <EvaluationSnapshot
            fingerprint="sha256:historical-preview"
            evaluatedAt="Historical preview"
            stale
          />
        </div>
      );
      break;
    case 'rule-action':
      preview = (
        <div className={styles.previewRow}>
          <RuleAction onClick={() => undefined}>Refresh evaluation</RuleAction>
          <RuleAction archived>Archived action</RuleAction>
          <RuleAction disabled>Unavailable action</RuleAction>
        </div>
      );
      break;
    case 'decision-card':
      preview = (
        <div className={styles.productStates}>
          <DecisionCard title="Keep local-first workflow" revision={2} status="PROPOSED" />
          <DecisionCard title="Use deterministic gates" revision={3} status="ACCEPTED" />
          <DecisionCard title="Previous execution path" revision={1} status="SUPERSEDED" />
        </div>
      );
      break;
    case 'revision-history':
      preview = (
        <RevisionHistory
          title="Decision history"
          revisions={[
            { revision: 1, text: 'Initial proposal (superseded).' },
            { revision: 2, text: 'Current reviewed decision.' },
          ]}
        />
      );
      break;
    case 'invariant-card':
      preview = (
        <div className={styles.productStates}>
          <InvariantCard title="No unverified claims" revision={3} acknowledgedRevision={null} />
          <InvariantCard title="Human review required" revision={2} acknowledgedRevision={2} />
          <InvariantCard
            title="Re-acknowledgement required"
            revision={4}
            acknowledgedRevision={3}
          />
        </div>
      );
      break;
    case 'repository-card':
      preview = (
        <div className={styles.productStates}>
          <RepositoryCard repository={previewRepository} />
          <RepositoryCard repository={previewRepository} observation={previewObservation} />
          <RepositoryCard repository={{ ...previewRepository, status: 'unavailable' }} />
        </div>
      );
      break;
    case 'context-package-card':
      preview = (
        <div className={styles.productStates}>
          <ContextPackageCard contextPackage={previewContextPackage} state="Fresh" />
          <ContextPackageCard contextPackage={previewContextPackage} state="Stale" />
          <ContextPackageCard state="Unavailable" />
        </div>
      );
      break;
    case 'report-field':
      preview = (
        <div className={styles.productStates}>
          <ReportField label="Executor" value="Human" />
          <ReportField label="Optional note" value="" />
        </div>
      );
      break;
    case 'provenance-notice':
      preview = (
        <div className={styles.productStates}>
          <ProvenanceNotice source="Human-reported run summary">
            No independent verification is implied.
          </ProvenanceNotice>
          <ProvenanceNotice state="Observed" source="Synthetic host observation">
            Observed context is not independently verified.
          </ProvenanceNotice>
          <ProvenanceNotice state="Unknown" source="No provenance recorded">
            The originating source is unknown.
          </ProvenanceNotice>
        </div>
      );
      break;
    case 'trust-disclosure':
      preview = (
        <div className={styles.productStates}>
          <TrustDisclosure state="Default">
            A blocked gate is not a publication, deployment, or release claim.
          </TrustDisclosure>
          <TrustDisclosure state="Expanded">
            A blocked gate is not a publication, deployment, or release claim.
          </TrustDisclosure>
        </div>
      );
      break;
    case 'download-action':
      preview = (
        <div className={styles.productStates}>
          <DownloadAction label="Download manifest" href="#preview-manifest" />
          <DownloadAction label="Download report" state="pending" />
          <DownloadAction
            label="Download failed"
            state="error"
            errorMessage="Artifact unavailable."
          />
        </div>
      );
      break;
    case 'verification-summary':
      preview = (
        <div className={styles.productStates}>
          <VerificationSummary outcome="PASS" fingerprint="sha256:scoped" blockers={[]} />
          <VerificationSummary outcome="NOT_RUN" fingerprint="sha256:not-run" blockers={[]} />
          <VerificationSummary
            outcome="FAIL"
            fingerprint="sha256:blocked"
            blockers={['Required evidence is missing.']}
          />
          <VerificationSummary outcome="PASS" fingerprint="sha256:stale" blockers={[]} stale />
        </div>
      );
      break;
    case 'release-gate':
      preview = (
        <div className={styles.productStates}>
          <ReleaseGate outcome="BLOCKED">
            <p>Required review is incomplete.</p>
          </ReleaseGate>
          <ReleaseGate outcome="NOT_READY" />
          <ReleaseGate outcome="SCOPED PASS">
            <p>Scoped checks passed; this is not a release action.</p>
          </ReleaseGate>
        </div>
      );
      break;
    default:
      return null;
  }

  return (
    <div className={styles.productFrame}>
      <div className={styles.productStates} data-product-pattern={item.id}>
        {preview}
      </div>
    </div>
  );
}

/** Catalog content; the development route and theme boundary live in the shell module. */
export function ComponentGalleryContent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [counter, setCounter] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      catalog.filter((item) =>
        [item.name, item.section, item.owner, item.figma].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      ),
    [normalizedQuery],
  );

  return (
    <div className={styles.gallery} data-theme={resolvedTheme}>
      <SectionHeader
        eyebrow="FORGE / Component Host / M1"
        title="Component Host"
        actions={
          <label className={styles.themeControl}>
            Preview theme{' '}
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as typeof theme)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </label>
        }
      />
      <p className={styles.intro}>
        A development-only catalog of actual exported React components. Fixtures are synthetic,
        deterministic and backend-free.
      </p>
      <div className={styles.toolbar}>
        <label htmlFor="component-search">Search components</label>
        <input
          id="component-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, owner or Figma reference"
        />
      </div>
      <ComponentGalleryLayout sections={catalogSections}>
        {catalogSections.map((section) => {
          const items = visible.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <section
              key={section}
              id={section.toLowerCase().replaceAll(' ', '-')}
              className={styles.section}
            >
              <SectionHeader headingLevel={2} title={section} />
              {items.map((item) => (
                <article className={styles.entry} key={item.id} data-component-id={item.id}>
                  <div className={styles.entryHeader}>
                    <div>
                      <h3>{item.name}</h3>
                      <p className={styles.owner}>{item.owner}</p>
                    </div>
                    <StatusChip
                      tone={item.status === 'IMPLEMENTED_NOT_REVIEWED' ? 'accent' : 'warning'}
                    >
                      {item.status}
                    </StatusChip>
                  </div>
                  <div data-component-preview={item.id}>
                    <ComponentPreview
                      item={item}
                      onIncrement={() => setCounter((value) => value + 1)}
                      count={counter}
                    />
                  </div>
                  <CatalogMeta item={item} />
                </article>
              ))}
            </section>
          );
        })}
        {!visible.length && (
          <Card>
            <p>No components match “{query}”.</p>
          </Card>
        )}
      </ComponentGalleryLayout>
      <p className={styles.caption}>
        Automated tests verify behavior and contracts. Figma parity remains IMPLEMENTED_NOT_REVIEWED
        until visual evidence is reviewed.
      </p>
    </div>
  );
}
