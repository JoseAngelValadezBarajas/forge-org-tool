import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { SearchField } from './SearchField';
describe('SearchField', () => {
  it('exposes search semantics and supports native clearable search input', () => {
    render(<SearchField aria-label="Search repositories" />);
    expect(screen.getByRole('searchbox', { name: 'Search repositories' })).toHaveAttribute(
      'type',
      'search',
    );
  });
});
