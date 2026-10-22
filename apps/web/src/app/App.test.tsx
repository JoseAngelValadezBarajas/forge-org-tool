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

  it('exposes the product shell hierarchy without inventing project routes', () => {
    renderRoute('/');

    expect(screen.getByRole('navigation', { name: 'Product navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspace' })).toHaveAttribute('href', '/');
    expect(screen.getByText('LOCAL MODE')).toBeInTheDocument();
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
