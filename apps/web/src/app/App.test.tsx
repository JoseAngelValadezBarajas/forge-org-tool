import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import parity from '../../../../docs/design/design-system-parity.json';
import { App } from './App';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('M1 application shell', () => {
  afterEach(() => {
    cleanup();
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

  it('exposes loading state and prevents native button interaction', () => {
    renderRoute('/__components');

    const loadingButton = screen.getByRole('button', { name: /working/i });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
  });

  it('supports gallery interaction and dark/light switching', () => {
    renderRoute('/__components');

    const gallery = screen.getByRole('heading', { name: 'Component Host' }).closest('[data-theme]');
    expect(gallery).toHaveAttribute('data-theme', 'dark');

    fireEvent.click(screen.getByRole('button', { name: /increment 0/i }));
    expect(screen.getByRole('button', { name: /increment 1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Switch to light$/ }));
    expect(gallery).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeInTheDocument();
  });

  it('provides searchable catalog sections and clearly labels review status', () => {
    renderRoute('/__components');

    expect(screen.getByRole('navigation', { name: 'Component host sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foundations and tokens' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Core UI primitives' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Product-specific components' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Icon library' }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-component-id^="icon-"] svg')).toHaveLength(35);
    expect(screen.getAllByText('IMPLEMENTED_NOT_REVIEWED').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search components' }), {
      target: { value: 'status' },
    });

    expect(screen.getByRole('heading', { name: 'StatusChip' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Button' })).not.toBeInTheDocument();
  });

  it('renders a stable host anchor for every canonical preview marked available', () => {
    const available = parity.inventory.filter(
      (entry) => entry.componentHost.status === 'AVAILABLE',
    );

    renderRoute('/__components');

    expect(available.length).toBeGreaterThan(0);
    for (const entry of available) {
      expect(
        document.querySelector(`[data-component-id="${entry.componentHost.id}"]`),
      ).not.toBeNull();
    }
  });

  it('previews every canonical icon export under its stable inventory ID', () => {
    renderRoute('/__components');

    const iconEntries = parity.inventory.filter((entry) => entry.category === 'icon');
    expect(iconEntries).toHaveLength(35);
    for (const entry of iconEntries) {
      expect(
        document.querySelector(`[data-component-id="${entry.componentHost.id}"]`),
      ).not.toBeNull();
    }
  });
});
