import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import parity from '../../../../docs/design/design-system-parity.json';
import { App } from './App';

function renderRoute(path: string) {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  if (path === '/__components') {
    return screen.findByRole('heading', { name: 'Component Host' }).then(() => result);
  }
  return result;
}

describe('M1 application shell', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200 })));
  });

  it('shows an actionable empty organization state', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByText('No workspaces yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeEnabled();
  });

  it('opens an Epic detail route with project context', async () => {
    renderRoute('/planning/w1/p1/epics/e1');
    expect(await screen.findByRole('heading', { name: 'Epic detail' })).toBeInTheDocument();
  });

  it('exposes the product shell hierarchy without inventing project routes', () => {
    renderRoute('/');

    expect(screen.getByRole('navigation', { name: 'Product navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspace' })).toHaveAttribute('href', '/');
    expect(screen.getByText('LOCAL MODE')).toBeInTheDocument();
  });

  it('exposes contextual destinations for every product capability on project routes', () => {
    renderRoute('/planning/w1/p1');

    const navigation = screen.getByRole('navigation', { name: 'Product navigation' });
    expect(within(navigation).getByRole('link', { name: 'Planning' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    expect(within(navigation).getByRole('link', { name: 'Workbench' })).toHaveAttribute(
      'href',
      '/workbench/w1/p1',
    );
    expect(within(navigation).getByRole('link', { name: 'Delivery' })).toHaveAttribute(
      'href',
      '/delivery/w1/p1',
    );
    expect(within(navigation).getByRole('link', { name: 'Repositories' })).toHaveAttribute(
      'href',
      '/repositories/w1/p1',
    );
    expect(within(navigation).getByRole('link', { name: 'Transfer' })).toHaveAttribute(
      'href',
      '/transfer/w1/p1',
    );
    expect(within(navigation).getByText('Readiness (choose a feature)')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('adds feature-scoped destinations from feature detail routes', () => {
    renderRoute('/planning/w1/p1/features/f1');

    const navigation = screen.getByRole('navigation', { name: 'Product navigation' });
    expect(within(navigation).getByRole('link', { name: 'Readiness' })).toHaveAttribute(
      'href',
      '/readiness/w1/p1/f1',
    );
    expect(within(navigation).getByRole('link', { name: 'Context' })).toHaveAttribute(
      'href',
      '/context/w1/p1/f1',
    );
  });

  it('shows a contextual breadcrumb from workspace through the current feature page', () => {
    renderRoute('/readiness/w1/p1/f1');

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Workspace' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(breadcrumb).getByRole('link', { name: 'Project' })).toHaveAttribute(
      'href',
      '/projects/w1/p1',
    );
    expect(within(breadcrumb).getByRole('link', { name: 'Feature' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/features/f1',
    );
    expect(within(breadcrumb).getByText('Readiness')).toHaveAttribute('aria-current', 'page');
  });

  it('opens persisted evidence detail through its direct project-scoped URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'e1',
            title: 'Synthetic report',
            summary: 'A human-reported reference',
            provenance: 'REPORTED',
            status: 'ACTIVE',
            reference_kind: 'url',
            reference_value: 'https://example.invalid/report',
            feature_id: null,
            created_at: '2026-10-22T00:00:00Z',
            project_id: 'p1',
          }),
          { status: 200 },
        ),
      ),
    );
    renderRoute('/delivery/w1/p1/evidence/e1');

    expect(await screen.findByRole('heading', { name: 'Synthetic report' })).toBeInTheDocument();
    expect(screen.getByText('REPORTED')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to delivery/i })).toHaveAttribute(
      'href',
      '/delivery/w1/p1',
    );
  });

  it('mounts run activity and immutable context snapshots at their direct URLs', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/runs/run-1'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'run-1',
              project_id: 'p1',
              feature_id: null,
              title: 'Human report',
              description: null,
              execution_mode: 'manual',
              executor_type: 'human',
              status: 'PLANNED',
              version: 1,
              created_at: '',
              updated_at: '',
            }),
            { status: 200 },
          ),
        );
      if (path.endsWith('/runs/run-1/events'))
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      if (path.endsWith('/context/packages/pkg-1'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'pkg-1',
              project_id: 'p1',
              feature_id: 'f1',
              schema_version: 'forge-context-v1',
              fingerprint: 'sha256:snapshot',
              payload_json: '{}',
              markdown: '# Saved context',
              created_at: '',
            }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const runView = render(
      <MemoryRouter initialEntries={['/workbench/w1/p1/runs/run-1']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Human report', level: 2 }),
    ).toBeInTheDocument();
    runView.unmount();

    render(
      <MemoryRouter initialEntries={['/context/w1/p1/f1/packages/pkg-1']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('sha256:snapshot')).toBeInTheDocument();
    expect(screen.getByText('# Saved context')).toBeInTheDocument();
  });

  it('exposes loading state and prevents native button interaction', async () => {
    await renderRoute('/__components');

    const loadingButton = screen.getByRole('button', { name: /working/i });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
  });

  it('gives host form controls accessible names from their visible labels', async () => {
    await renderRoute('/__components');

    expect(screen.getByRole('checkbox', { name: 'Unchecked' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Read only' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Off' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'On' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Disabled' })).toBeDisabled();
  });

  it('previews the canonical PageHeader breadcrumb composition', async () => {
    await renderRoute('/__components');

    expect(
      screen.getByText('Feature detail', { selector: '[aria-current="page"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Planning$/ })).toHaveAttribute(
      'href',
      '/planning/preview',
    );
  });

  it('previews Disabled navigation and every DependencyGroup state', async () => {
    await renderRoute('/__components');

    const disabledItem = document.querySelector(
      '[data-product-pattern="navigation-item"] [aria-disabled="true"]',
    );
    expect(disabledItem).toHaveTextContent('Unavailable');
    expect(disabledItem?.closest('a')).toBeNull();

    const dependencies = document.querySelector('[data-product-pattern="dependency-group"]');
    expect(within(dependencies as HTMLElement).getByText('BLOCKED')).toBeInTheDocument();
    expect(within(dependencies as HTMLElement).getByText('CLEAR')).toBeInTheDocument();
    expect(within(dependencies as HTMLElement).getByText('ARCHIVED')).toBeInTheDocument();
  });

  it('previews Reported, Observed, and Unknown provenance without certifying verification', async () => {
    await renderRoute('/__components');

    const provenance = document.querySelector('[data-product-pattern="provenance-notice"]');
    expect(within(provenance as HTMLElement).getByText('REPORTED')).toBeInTheDocument();
    expect(within(provenance as HTMLElement).getByText('OBSERVED')).toBeInTheDocument();
    expect(within(provenance as HTMLElement).getByText('UNKNOWN')).toBeInTheDocument();
    expect(
      within(provenance as HTMLElement).getAllByText(/not.*verification/i).length,
    ).toBeGreaterThan(0);
  });

  it('previews both canonical TrustDisclosure variants as static compositions', async () => {
    await renderRoute('/__components');

    const trustDisclosure = document.querySelector('[data-product-pattern="trust-disclosure"]');
    expect(within(trustDisclosure as HTMLElement).getByText('DEFAULT')).toBeInTheDocument();
    expect(within(trustDisclosure as HTMLElement).getByText('EXPANDED')).toBeInTheDocument();
    expect(trustDisclosure).not.toHaveAttribute('aria-expanded');
  });

  it('previews each supported product state from the feature-owned components', async () => {
    await renderRoute('/__components');

    const planning = document.querySelector('[data-product-pattern="project-planning-home"]');
    expect(within(planning as HTMLElement).getByText('DEFAULT')).toBeInTheDocument();
    expect(within(planning as HTMLElement).getByText('EMPTY')).toBeInTheDocument();
    expect(within(planning as HTMLElement).getByText('ARCHIVED')).toBeInTheDocument();

    const snapshots = document.querySelector('[data-product-pattern="evaluation-snapshot"]');
    expect(within(snapshots as HTMLElement).getByText('PREVIEW')).toBeInTheDocument();
    expect(within(snapshots as HTMLElement).getByText('SAVED')).toBeInTheDocument();
    expect(within(snapshots as HTMLElement).getByText('STALE')).toBeInTheDocument();

    const invariants = document.querySelector('[data-product-pattern="invariant-card"]');
    expect(within(invariants as HTMLElement).getByText('STALE')).toBeInTheDocument();

    const revisions = document.querySelector('[data-product-pattern="revision-history"]');
    expect(within(revisions as HTMLElement).getByText('CURRENT')).toBeInTheDocument();
    expect(within(revisions as HTMLElement).getByText('SUPERSEDED')).toBeInTheDocument();
  });

  it('supports gallery interaction and dark/light switching', async () => {
    await renderRoute('/__components');

    const gallery = screen.getByRole('heading', { name: 'Component Host' }).closest('[data-theme]');
    expect(gallery).toHaveAttribute('data-theme', 'dark');

    fireEvent.click(screen.getByRole('button', { name: /increment 0/i }));
    expect(screen.getByRole('button', { name: /increment 1/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Preview theme' }), {
      target: { value: 'light' },
    });
    expect(gallery).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('combobox', { name: 'Preview theme' })).toHaveValue('light');
  });

  it('keeps the Component Host preview isolated from persisted application appearance', async () => {
    localStorage.setItem('forge-theme', 'dark');
    await renderRoute('/__components');

    const app = screen.getByTestId('application-shell');
    const gallery = screen.getByRole('heading', { name: 'Component Host' }).closest('[data-theme]');
    expect(app).toHaveAttribute('data-theme', 'dark');
    expect(gallery).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    fireEvent.change(screen.getByRole('combobox', { name: 'Preview theme' }), {
      target: { value: 'light' },
    });
    expect(gallery).toHaveAttribute('data-theme', 'light');
    expect(app).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('forge-theme')).toBe('dark');
  });

  it('previews primitive palette tokens alongside semantic theme tokens', async () => {
    await renderRoute('/__components');

    expect(screen.getByText('--forge-palette-graphite-950')).toBeInTheDocument();
    expect(screen.getByText('--forge-palette-copper-500')).toBeInTheDocument();
  });

  it('provides a three-mode persistent application appearance control', () => {
    renderRoute('/');

    const appearance = screen.getByRole('combobox', { name: 'Appearance' });
    expect(appearance).toHaveValue('dark');
    expect(screen.getByTestId('application-shell')).toHaveAttribute('data-theme', 'dark');
    fireEvent.change(appearance, { target: { value: 'light' } });
    expect(screen.getByTestId('application-shell')).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('forge-theme')).toBe('light');
    fireEvent.change(appearance, { target: { value: 'system' } });
    expect(appearance).toHaveValue('system');
    expect(localStorage.getItem('forge-theme')).toBe('system');
  });

  it('provides searchable catalog sections and clearly labels review status', async () => {
    await renderRoute('/__components');

    expect(screen.getByRole('navigation', { name: 'Component host sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foundations and tokens' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Core UI primitives' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Product-specific components' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Icon library' }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-icon-name]')).toHaveLength(35);
    expect(screen.getAllByText('IMPLEMENTED_NOT_REVIEWED').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search components' }), {
      target: { value: 'status' },
    });

    expect(screen.getByRole('heading', { name: 'StatusChip' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Button' })).not.toBeInTheDocument();
  });

  it('renders a real preview under the stable host ID for every canonical core family', async () => {
    const coreEntries = parity.inventory.filter((entry) => entry.category === 'core');

    await renderRoute('/__components');

    expect(coreEntries).toHaveLength(37);
    for (const entry of coreEntries) {
      expect(
        document.querySelector(`[data-component-id="${entry.componentHost.id}"]`),
      ).not.toBeNull();
      const preview = document.querySelector(
        `[data-component-preview="${entry.componentHost.id}"]`,
      );
      expect(
        preview?.childElementCount,
        `${entry.figmaName} must render a real preview`,
      ).toBeGreaterThan(0);
    }
  });

  it('renders a real feature-owned preview for every page-20 product pattern', async () => {
    const productEntries = parity.inventory.filter((entry) => entry.category === 'product');

    await renderRoute('/__components');

    expect(productEntries).toHaveLength(28);
    for (const entry of productEntries) {
      const hostId = entry.componentHost.id;
      expect(entry.componentHost.status, `${entry.figmaName} host coverage`).toBe('AVAILABLE');
      expect(entry.visualReviewStatus, `${entry.figmaName} visual review`).toBe(
        'NOT_HUMAN_REVIEWED',
      );
      const preview = document.querySelector(`[data-product-pattern="${hostId}"]`);
      expect(preview, `${entry.figmaName} must have a product preview`).not.toBeNull();
      expect(
        preview?.childElementCount,
        `${entry.figmaName} must render its owned export`,
      ).toBeGreaterThan(0);
      expect(document.querySelector(`[data-component-id="${hostId}"]`)).toHaveTextContent(
        'AVAILABLE',
      );
    }
  });

  it('previews the reconciled canonical Card and status variants', async () => {
    await renderRoute('/__components');

    expect(
      document.querySelector('[data-component-preview="card"] [data-variant="elevated"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="status-chip"] [data-tone="info"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="status-chip"] [data-tone="reported"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="badge"] [data-tone="info"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="alert"] [data-tone="error"]'),
    ).not.toBeNull();
  });

  it('previews the canonical MultiSelect and FilePicker state compositions', async () => {
    await renderRoute('/__components');

    expect(
      document.querySelectorAll('[data-component-preview="multi-select"] fieldset'),
    ).toHaveLength(2);
    expect(
      document.querySelector('[data-component-preview="file-picker"] [data-state="empty"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="file-picker"] [data-state="selected"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="file-picker"] [data-state="error"]'),
    ).not.toBeNull();
  });

  it('keeps modal previews closed until explicitly opened and lets the preview close', async () => {
    await renderRoute('/__components');
    const dialogPreview = document.querySelector(
      '[data-component-preview="dialog"]',
    ) as HTMLElement;
    const view = within(dialogPreview);

    expect(dialogPreview.querySelector('dialog[open]')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Preview confirm dialog' }));
    expect(await view.findByRole('dialog', { name: 'Confirm transfer' })).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Close preview' }));
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('distinguishes implementation gaps from implementations awaiting visual review', async () => {
    await renderRoute('/__components');

    expect(document.querySelector('[data-component-id="checkbox"]')).toHaveTextContent(
      'IMPLEMENTED_NOT_REVIEWED',
    );
    expect(document.querySelector('[data-component-id="card"]')).toHaveTextContent(
      'IMPLEMENTED_NOT_REVIEWED',
    );
  });

  it('previews every canonical icon export under its stable inventory ID', async () => {
    await renderRoute('/__components');

    const iconEntries = parity.inventory.filter((entry) => entry.category === 'icon');
    expect(iconEntries).toHaveLength(35);
    for (const entry of iconEntries) {
      expect(
        document.querySelector(`[data-component-id="${entry.componentHost.id}"]`),
      ).not.toBeNull();
    }
  });
});
