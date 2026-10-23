import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ComponentGallery } from './ComponentGallery';

function renderHost() {
  return render(
    <MemoryRouter>
      <ComponentGallery />
    </MemoryRouter>,
  );
}

describe('Component Host', () => {
  afterEach(cleanup);

  it('navigates to a catalog section using its in-page link', () => {
    renderHost();

    const nav = screen.getByRole('navigation', { name: 'Component host sections' });
    const sectionLink = within(nav).getByRole('link', { name: 'Foundations and tokens' });
    fireEvent.click(sectionLink);

    expect(sectionLink).toHaveAttribute('href', '#foundations-and-tokens');
    expect(document.getElementById('foundations-and-tokens')).toBeInTheDocument();
  });

  it('filters to a real preview and updates the selected theme', () => {
    renderHost();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search components' }), {
      target: { value: 'Button' },
    });
    expect(document.querySelector('[data-component-preview="button"] button')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Card' })).not.toBeInTheDocument();

    const gallery = screen.getByRole('heading', { name: 'Component Host' }).closest('[data-theme]');
    fireEvent.change(screen.getByRole('combobox', { name: 'Preview theme' }), {
      target: { value: 'light' },
    });
    expect(gallery).toHaveAttribute('data-theme', 'light');
  });

  it('retains catalog navigation and preview content in the narrow layout', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    renderHost();

    expect(screen.getByRole('navigation', { name: 'Component host sections' })).toBeVisible();
    expect(document.querySelector('[data-component-preview="button"] button')).toBeInTheDocument();
  });

  it('documents supported component compositions and the unconfirmed product empty-state master', () => {
    renderHost();

    const cardPreview = document.querySelector('[data-component-preview="card"]');
    const statusPreview = document.querySelector('[data-component-preview="status-chip"]');
    const headerPreview = document.querySelector('[data-component-preview="section-header"]');
    expect(cardPreview).not.toBeNull();
    expect(statusPreview).not.toBeNull();
    expect(headerPreview).not.toBeNull();
    expect(within(cardPreview as HTMLElement).getByText('Elevated')).toBeInTheDocument();
    expect(within(statusPreview as HTMLElement).getByText('Info')).toBeInTheDocument();
    expect(within(statusPreview as HTMLElement).getByText('Reported')).toBeInTheDocument();
    expect(within(headerPreview as HTMLElement).getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/exact page-20 empty-state master unconfirmed/i)).toBeInTheDocument();
  });
});
