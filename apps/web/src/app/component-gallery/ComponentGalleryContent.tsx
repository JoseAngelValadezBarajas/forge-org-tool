import { useMemo, useState } from 'react';
import { Card, SectionHeader, StatusChip } from '@corefoundry-labs/forge-ui';
import { useTheme } from '../theme';
import styles from './ComponentGallery.module.css';
import parity from '../../../../../docs/design/design-system-parity.json';
import { catalogFamilyById, catalogSections } from './catalog/inventory';
import { catalogStatus } from './catalog/parity-status';
import { foundationCatalog } from './catalog/foundations';
import { productPatternCatalogIds } from './catalog/product-patterns';
import type { CatalogItem, CatalogSection } from './catalog/types';
import { TokenPreview } from './previews/foundations';
import { IconCatalogPreview } from './previews/icons';
import { renderActionPreview } from './previews/actions';
import { renderFormPreview } from './previews/forms';
import { renderNavigationPreview } from './previews/navigation';
import { renderSurfaceDataPreview } from './previews/surfaces-data';
import { renderFeedbackPreview } from './previews/feedback-overlays';
import { renderProductPatternPreview } from './previews/product-patterns';
import { ComponentGalleryLayout } from './shell/ComponentGalleryLayout';

const catalog: CatalogItem[] = [
  ...foundationCatalog,
  {
    id: 'button',
    name: 'Button',
    section: 'Core UI primitives',
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-ui',
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
    owner: '@corefoundry-labs/forge-icons',
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
      owner: '@corefoundry-labs/forge-ui',
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
    .filter(
      (entry) =>
        entry.category === 'product' &&
        productPatternCatalogIds.includes(
          entry.componentHost.id as (typeof productPatternCatalogIds)[number],
        ),
    )
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
  const actionPreview = renderActionPreview(item.id, { count, onIncrement });
  if (actionPreview !== null) return actionPreview;
  const formPreview = renderFormPreview(item.id);
  if (formPreview !== null) return formPreview;
  const navigationPreview = renderNavigationPreview(item.id, onIncrement);
  if (navigationPreview !== null) return navigationPreview;
  const surfaceDataPreview = renderSurfaceDataPreview(item.id);
  if (surfaceDataPreview !== null) return surfaceDataPreview;
  const feedbackPreview = renderFeedbackPreview(item.id);
  if (feedbackPreview !== null) return feedbackPreview;
  const productPatternPreview = renderProductPatternPreview(item.id);
  if (productPatternPreview !== null)
    return <div data-product-pattern={item.id}>{productPatternPreview}</div>;

  if (item.id === 'tokens') return <TokenPreview />;
  if (item.id === 'icon-library') return <IconCatalogPreview />;
  return null;
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
