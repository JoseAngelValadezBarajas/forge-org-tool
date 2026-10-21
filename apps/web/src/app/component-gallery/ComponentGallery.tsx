import { useMemo, useState } from 'react';
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
import { OrganizationEmptyState } from '../../features/organization';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Check,
  CheckCircle,
  Chevron,
  ChevronDown,
  ChevronRight,
  Close,
  Clock,
  Download,
  Edit,
  Eye,
  ExternalLink,
  Filter,
  Folder,
  GitBranch,
  GripVertical,
  History,
  Info,
  Layers,
  Link,
  Lock,
  Menu,
  Minus,
  Plus,
  Refresh,
  Search,
  Settings,
  Trash,
  Upload,
  XCircle,
} from '@forge-org/icons';
import styles from './ComponentGallery.module.css';
import parity from '../../../../../docs/design/design-system-parity.json';

type CatalogSection =
  | 'Foundations and tokens'
  | 'Core UI primitives'
  | 'Generic shared compositions'
  | 'Product-specific components'
  | 'Icon library';
type CatalogStatus = 'IMPLEMENTED_NOT_REVIEWED' | 'PARTIAL_NOT_REVIEWED' | 'NOT_IMPLEMENTED';

interface CatalogItem {
  id: string;
  name: string;
  section: CatalogSection;
  owner: string;
  status: CatalogStatus;
  figma: string;
  variants: string;
  states: string;
  accessibility: string;
  deviations: string;
}

const catalog: CatalogItem[] = [
  {
    id: 'tokens',
    name: 'Semantic tokens',
    section: 'Foundations and tokens',
    owner: '@forge-org/tokens',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: 'Page 02: Foundations and Tokens',
    variants: 'dark, light',
    states: 'theme selection',
    accessibility: 'Color is paired with text labels in previews.',
    deviations: 'Figma variable reconciliation is pending.',
  },
  {
    id: 'button',
    name: 'Button',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'primary, secondary, ghost, danger',
    states: 'default, focus, disabled, loading',
    accessibility: 'Native button semantics; loading is disabled and aria-busy.',
    deviations: 'Visual review is pending.',
  },
  {
    id: 'card',
    name: 'Card',
    section: 'Core UI primitives',
    owner: '@forge-org/ui',
    status: 'IMPLEMENTED_NOT_REVIEWED',
    figma: '173:2 Core UI Components',
    variants: 'default; typed semantic root',
    states: 'default',
    accessibility: 'Neutral div root with typed semantic option.',
    deviations: 'Figma Elevated variant is not implemented; visual review is pending.',
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
    variants: 'neutral, accent, success, warning, danger',
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
    figma: '173:2 Core UI Components',
    variants: 'neutral, accent, success, warning, danger',
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
    figma: '173:2 Core UI Components',
    variants: 'eyebrow, action slot',
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
    figma: '229:2 Product Patterns',
    variants: 'empty state',
    states: 'not implemented',
    accessibility: 'Uses shared primitives and a disabled action with an explicit label.',
    deviations: 'Product behavior is intentionally not implemented in M1.',
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
  item.status =
    entry.implementationStatus === 'NOT_IMPLEMENTED'
      ? 'NOT_IMPLEMENTED'
      : entry.implementationStatus === 'PARTIAL'
        ? 'PARTIAL_NOT_REVIEWED'
        : 'IMPLEMENTED_NOT_REVIEWED';
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
      status:
        entry.implementationStatus === 'NOT_IMPLEMENTED'
          ? ('NOT_IMPLEMENTED' as const)
          : entry.implementationStatus === 'PARTIAL'
            ? ('PARTIAL_NOT_REVIEWED' as const)
            : ('IMPLEMENTED_NOT_REVIEWED' as const),
      figma: entry.figmaNodeId,
      variants: entry.variants.map((variant) => variant.name).join('; ') || 'Default contract',
      states: entry.states.join(', ') || 'No State axis documented',
      accessibility:
        accessibilityNotes[entry.figmaName] ??
        'See the public contract and colocated accessibility tests.',
      deviations: `${entry.implementationNotes} Human Figma visual review pending.`,
    })),
);

const icons = [
  ['Plus', Plus],
  ['Close', Close],
  ['Chevron', Chevron],
  ['Check', Check],
  ['Minus', Minus],
  ['Search', Search],
  ['Menu', Menu],
  ['Edit', Edit],
  ['Trash', Trash],
  ['Download', Download],
  ['Upload', Upload],
  ['Filter', Filter],
  ['ArrowLeft', ArrowLeft],
  ['ArrowRight', ArrowRight],
  ['ArrowUp', ArrowUp],
  ['ArrowDown', ArrowDown],
  ['AlertTriangle', AlertTriangle],
  ['Info', Info],
  ['Clock', Clock],
  ['Folder', Folder],
  ['GitBranch', GitBranch],
  ['Refresh', Refresh],
  ['ExternalLink', ExternalLink],
  ['Lock', Lock],
  ['History', History],
  ['CheckCircle', CheckCircle],
  ['XCircle', XCircle],
  ['Bell', Bell],
  ['ChevronDown', ChevronDown],
  ['ChevronRight', ChevronRight],
  ['GripVertical', GripVertical],
  ['Link', Link],
  ['Eye', Eye],
  ['Layers', Layers],
  ['Settings', Settings],
] as const;

function IconCatalogPreview() {
  return (
    <Card>
      <div className={styles.iconGrid}>
        {icons.map(([name, Icon]) => (
          <div
            className={styles.iconItem}
            data-component-id={`icon-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`}
            data-icon-name={name}
            key={name}
          >
            <Icon size={20} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const sections: CatalogSection[] = [
  'Foundations and tokens',
  'Core UI primitives',
  'Generic shared compositions',
  'Product-specific components',
  'Icon library',
];

function CatalogMeta({ item }: { item: CatalogItem }) {
  return (
    <dl className={styles.meta}>
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

function TokenPreview() {
  return (
    <Card>
      <div className={styles.tokenGrid} aria-label="Semantic token preview">
        {['bg', 'surface', 'surface-raised', 'text', 'accent', 'success', 'warning', 'danger'].map(
          (token) => (
            <div className={styles.token} key={token}>
              <span
                className={styles.swatch}
                style={{ background: `var(--forge-${token})` }}
                aria-hidden="true"
              />
              <code>--forge-{token}</code>
            </div>
          ),
        )}
      </div>
    </Card>
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
        <Card>
          <FormField label="Select preview">
            <Select defaultValue="one">
              <option value="one">Option one</option>
              <option value="two">Option two</option>
            </Select>
          </FormField>
        </Card>
      );
    case 'textarea':
      return (
        <Card>
          <FormField label="Textarea preview">
            <Textarea placeholder="Type details" />
          </FormField>
        </Card>
      );
    case 'checkbox':
      return (
        <Card>
          <Checkbox aria-label="Checkbox preview" /> <span>Checkbox preview</span>
        </Card>
      );
    case 'form-field':
      return (
        <Card>
          <FormField label="Field label" hint="Helpful hint">
            <Input placeholder="Field value" />
          </FormField>
        </Card>
      );
    case 'search-field':
      return (
        <Card>
          <SearchField aria-label="Search preview" placeholder="Search" />
        </Card>
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
      return <Progress value={64} max={100} label="Progress preview" />;
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
        <Card>
          <IconButton aria-label="Add item">
            <Plus size={18} />
          </IconButton>
        </Card>
      );
    case 'multi-select':
      return (
        <Card>
          <FormField label="Project members">
            <MultiSelect
              aria-label="Project members"
              defaultValue={['alex']}
              options={[
                { value: 'alex', label: 'Alex' },
                { value: 'sam', label: 'Sam' },
                { value: 'lee', label: 'Lee' },
              ]}
            />
          </FormField>
        </Card>
      );
    case 'file-picker':
      return (
        <Card>
          <FormField label="Evidence file">
            <FilePicker aria-label="Evidence file" accept=".json,.md,.pdf" />
          </FormField>
        </Card>
      );
    case 'form-actions':
      return (
        <Card>
          <FormActions>
            <Button variant="secondary">Cancel</Button>
            <Button>Save changes</Button>
          </FormActions>
        </Card>
      );
    case 'radio':
      return (
        <Card>
          <fieldset className={styles.fieldset}>
            <legend>Repository access</legend>
            <label>
              <Radio name="host-repo-access" value="read" defaultChecked /> Read only
            </label>
            <label>
              <Radio name="host-repo-access" value="write" /> Read and write
            </label>
          </fieldset>
        </Card>
      );
    case 'switch':
      return (
        <Card>
          <label className={styles.previewRow}>
            <Switch aria-label="Enable local observation" defaultChecked /> Enable local observation
          </label>
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
        <Card>
          <StatePanel
            kind="readOnly"
            title="Planning-only workspace"
            description="No repository is required."
          />
        </Card>
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
            <Skeleton aria-hidden="true" />
            <Skeleton aria-hidden="true" />
          </div>
        </Card>
      );
    case 'toast':
      return <Toast data-component-id={item.id}>Workspace settings saved.</Toast>;
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
        </Card>
      );
    case 'dialog':
      return (
        <Card>
          <Dialog
            open
            title="Confirm transfer"
            description="No data is saved until you confirm."
            actions={
              <>
                <Button variant="secondary">Cancel</Button>
                <Button>Confirm</Button>
              </>
            }
          >
            Review the included project planning data.
          </Dialog>
        </Card>
      );
    case 'popover':
      return (
        <Card>
          <Popover trigger="Details">
            <p>Local paths remain on this device.</p>
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
  }
}

/** Development-only inspection route. It showcases real exports and deterministic fixtures. */
export function ComponentGallery() {
  const [light, setLight] = useState(false);
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
    <div className={styles.gallery} data-theme={light ? 'light' : 'dark'}>
      <SectionHeader
        eyebrow="FORGE / Component Host / M1"
        title="Component Host"
        actions={
          <Button variant="secondary" onClick={() => setLight((value) => !value)}>
            Switch to {light ? 'dark' : 'light'}
          </Button>
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
      <div className={styles.layout}>
        <nav className={styles.catalogNav} aria-label="Component host sections">
          <strong>Catalog</strong>
          {sections.map((section) => (
            <a key={section} href={`#${section.toLowerCase().replaceAll(' ', '-')}`}>
              {section}
            </a>
          ))}
        </nav>
        <div className={styles.content}>
          {sections.map((section) => {
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
        </div>
      </div>
      <p className={styles.caption}>
        Automated tests verify behavior and contracts. Figma parity remains IMPLEMENTED_NOT_REVIEWED
        until visual evidence is reviewed.
      </p>
    </div>
  );
}
