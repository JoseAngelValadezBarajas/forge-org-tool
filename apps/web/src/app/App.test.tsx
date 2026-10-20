import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('M1 application shell', () => {
  afterEach(() => cleanup());

  it('shows a truthful empty organization state', () => {
    renderRoute('/');

    expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByText(/does not display fictitious project data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeDisabled();
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

    fireEvent.click(screen.getByRole('button', { name: /switch to light/i }));
    expect(gallery).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeInTheDocument();
  });

  it('provides searchable catalog sections and honest planned entries', () => {
    renderRoute('/__components');

    expect(screen.getByRole('navigation', { name: 'Component host sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foundations and tokens' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Core UI primitives' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Product-specific components' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Icon library' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('NOT_IMPLEMENTED').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search components' }), { target: { value: 'status' } });

    expect(screen.getByRole('heading', { name: 'StatusChip' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Button' })).not.toBeInTheDocument();
  });
});
