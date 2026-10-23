import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { FilterBar } from './FilterBar';

describe('FilterBar', () => {
  it('keeps filter controls labeled and announces the filtered result count', () => {
    render(
      <FilterBar resultCount={0}>
        <label>
          Search <input type="search" />
        </label>
      </FilterBar>,
    );
    expect(screen.getByRole('region', { name: 'Filter planning items' })).toHaveAttribute(
      'data-state',
      'NoResults',
    );
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('0 planning items')).toHaveAttribute('aria-live', 'polite');
  });
});
