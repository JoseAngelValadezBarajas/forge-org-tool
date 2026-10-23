import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from './SearchField';
describe('SearchField', () => {
  it('exposes search semantics and supports native clearable search input', () => {
    render(<SearchField aria-label="Search repositories" />);
    expect(screen.getByRole('searchbox', { name: 'Search repositories' })).toHaveAttribute(
      'type',
      'search',
    );
  });

  it('renders a search icon and an optional clear action for a query', () => {
    const onClear = vi.fn();
    const { container } = render(
      <SearchField
        aria-label="Search repositories"
        defaultValue="forge"
        onClear={onClear}
        clearable
      />,
    );

    const view = within(container);
    expect(view.getByRole('searchbox', { name: 'Search repositories' })).toHaveValue('forge');
    expect(container.querySelector('[data-icon="Search"]')).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Clear search' }));
    expect(view.getByRole('searchbox', { name: 'Search repositories' })).toHaveValue('');
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('does not expose the clear action when disabled', () => {
    const { container } = render(
      <SearchField aria-label="Disabled search" value="query" disabled clearable />,
    );
    const view = within(container);
    expect(view.getByRole('searchbox', { name: 'Disabled search' })).toBeDisabled();
    expect(view.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
