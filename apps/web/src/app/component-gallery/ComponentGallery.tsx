import { useMemo, useState } from 'react';
import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import { OrganizationEmptyState } from '../../features/organization';
import styles from './ComponentGallery.module.css';

type CatalogSection = 'Foundations and tokens' | 'Core UI primitives' | 'Generic shared compositions' | 'Product-specific components' | 'Icon library';
type CatalogStatus = 'IMPLEMENTED_NOT_REVIEWED' | 'NOT_IMPLEMENTED';

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
  { id: 'tokens', name: 'Semantic tokens', section: 'Foundations and tokens', owner: '@forge-org/tokens', status: 'IMPLEMENTED_NOT_REVIEWED', figma: 'Page 02: Foundations and Tokens', variants: 'dark, light', states: 'theme selection', accessibility: 'Color is paired with text labels in previews.', deviations: 'Figma variable reconciliation is pending.' },
  { id: 'button', name: 'Button', section: 'Core UI primitives', owner: '@forge-org/ui', status: 'IMPLEMENTED_NOT_REVIEWED', figma: '173:2 Core UI Components', variants: 'primary, secondary, ghost, danger', states: 'default, focus, disabled, loading', accessibility: 'Native button semantics; loading is disabled and aria-busy.', deviations: 'Visual review is pending.' },
  { id: 'card', name: 'Card', section: 'Core UI primitives', owner: '@forge-org/ui', status: 'IMPLEMENTED_NOT_REVIEWED', figma: '173:2 Core UI Components', variants: 'default', states: 'default', accessibility: 'Uses a semantic section element.', deviations: 'Visual review is pending.' },
  { id: 'status-chip', name: 'StatusChip', section: 'Core UI primitives', owner: '@forge-org/ui', status: 'IMPLEMENTED_NOT_REVIEWED', figma: '173:2 Core UI Components', variants: 'neutral, accent, success, warning, danger', states: 'default', accessibility: 'Status text is always rendered; tone is supplementary.', deviations: 'Visual review is pending.' },
  { id: 'section-header', name: 'SectionHeader', section: 'Generic shared compositions', owner: '@forge-org/ui', status: 'IMPLEMENTED_NOT_REVIEWED', figma: '173:2 Core UI Components', variants: 'eyebrow, action slot', states: 'default', accessibility: 'Uses a heading and named action region when supplied.', deviations: 'Visual review is pending.' },
  { id: 'organization-empty-state', name: 'OrganizationEmptyState', section: 'Product-specific components', owner: 'apps/web/src/features/organization', status: 'IMPLEMENTED_NOT_REVIEWED', figma: '229:2 Product Patterns', variants: 'empty state', states: 'not implemented', accessibility: 'Uses shared primitives and a disabled action with an explicit label.', deviations: 'Product behavior is intentionally not implemented in M1.' },
  { id: 'icon-library', name: 'Icon library', section: 'Icon library', owner: 'Not assigned', status: 'NOT_IMPLEMENTED', figma: '173:2 Core UI Components', variants: 'planned', states: 'unavailable', accessibility: 'No icon is presented as available.', deviations: 'Requires a design and licensing decision.' },
];

const sections: CatalogSection[] = ['Foundations and tokens', 'Core UI primitives', 'Generic shared compositions', 'Product-specific components', 'Icon library'];

function CatalogMeta({ item }: { item: CatalogItem }) {
  return <dl className={styles.meta}>
    <div><dt>Owner</dt><dd>{item.owner}</dd></div>
    <div><dt>Status</dt><dd><StatusChip tone={item.status === 'NOT_IMPLEMENTED' ? 'warning' : 'accent'}>{item.status}</StatusChip></dd></div>
    <div><dt>Figma</dt><dd>{item.figma}</dd></div>
    <div><dt>Variants</dt><dd>{item.variants}</dd></div>
    <div><dt>States</dt><dd>{item.states}</dd></div>
    <div><dt>Accessibility</dt><dd>{item.accessibility}</dd></div>
    <div><dt>Known deviation</dt><dd>{item.deviations}</dd></div>
  </dl>;
}

function TokenPreview() {
  return <Card><div className={styles.tokenGrid} aria-label="Semantic token preview">
    {['bg', 'surface', 'surface-raised', 'text', 'accent', 'success', 'warning', 'danger'].map((token) => <div className={styles.token} key={token}>
      <span className={styles.swatch} style={{ background: `var(--forge-${token})` }} aria-hidden="true" /><code>--forge-{token}</code>
    </div>)}
  </div></Card>;
}

function ComponentPreview({ item, onIncrement, count }: { item: CatalogItem; onIncrement: () => void; count: number }) {
  switch (item.id) {
    case 'tokens': return <TokenPreview />;
    case 'button': return <Card><div className={styles.previewRow}>
      <Button onClick={onIncrement}>Increment {count}</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button loading>Loading</Button><Button disabled>Disabled</Button>
    </div></Card>;
    case 'card': return <Card><strong>Actual Card preview</strong><p>Content is supplied by the host fixture, not a backend record.</p></Card>;
    case 'status-chip': return <Card><div className={styles.previewRow}>
      <StatusChip>Neutral</StatusChip><StatusChip tone="accent">Accent</StatusChip><StatusChip tone="success">Success</StatusChip><StatusChip tone="warning">Warning</StatusChip><StatusChip tone="danger">Danger</StatusChip>
    </div></Card>;
    case 'section-header': return <Card><SectionHeader headingLevel={3} eyebrow="Shared composition" title="SectionHeader" actions={<Button variant="ghost">Action</Button>} /></Card>;
    case 'organization-empty-state': return <div className={styles.productFrame}><OrganizationEmptyState /></div>;
    case 'icon-library': return <Card><StatusChip tone="warning">NOT_IMPLEMENTED</StatusChip><p>No icon implementation is available for preview.</p></Card>;
  }
}

/** Development-only inspection route. It showcases real exports and deterministic fixtures. */
export function ComponentGallery() {
  const [light, setLight] = useState(false);
  const [query, setQuery] = useState('');
  const [counter, setCounter] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(() => catalog.filter((item) => [item.name, item.section, item.owner, item.figma].some((value) => value.toLowerCase().includes(normalizedQuery))), [normalizedQuery]);

  return <div className={styles.gallery} data-theme={light ? 'light' : 'dark'}>
    <SectionHeader eyebrow="FORGE / Component Host / M1" title="Component Host" actions={<Button variant="secondary" onClick={() => setLight((value) => !value)}>Switch to {light ? 'dark' : 'light'}</Button>} />
    <p className={styles.intro}>A development-only catalog of actual exported React components. Fixtures are synthetic, deterministic and backend-free.</p>
    <div className={styles.toolbar}>
      <label htmlFor="component-search">Search components</label>
      <input id="component-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, owner or Figma reference" />
    </div>
    <div className={styles.layout}>
      <nav className={styles.catalogNav} aria-label="Component host sections">
        <strong>Catalog</strong>
        {sections.map((section) => <a key={section} href={`#${section.toLowerCase().replaceAll(' ', '-')}`}>{section}</a>)}
      </nav>
      <div className={styles.content}>
        {sections.map((section) => {
          const items = visible.filter((item) => item.section === section);
          if (!items.length) return null;
          return <section key={section} id={section.toLowerCase().replaceAll(' ', '-')} className={styles.section}>
            <SectionHeader headingLevel={2} title={section} />
            {items.map((item) => <article className={styles.entry} key={item.id}>
              <div className={styles.entryHeader}><div><h3>{item.name}</h3><p className={styles.owner}>{item.owner}</p></div><StatusChip tone={item.status === 'NOT_IMPLEMENTED' ? 'warning' : 'accent'}>{item.status}</StatusChip></div>
              <ComponentPreview item={item} onIncrement={() => setCounter((value) => value + 1)} count={counter} />
              <CatalogMeta item={item} />
            </article>)}
          </section>;
        })}
        {!visible.length && <Card><p>No components match “{query}”.</p></Card>}
      </div>
    </div>
    <p className={styles.caption}>Automated tests verify behavior and contracts. Figma parity remains IMPLEMENTED_NOT_REVIEWED until visual evidence is reviewed.</p>
  </div>;
}
