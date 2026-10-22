// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderProductPatternPreview } from './product-patterns';

describe('product pattern previews', () => {
  afterEach(cleanup);

  it('renders feature-owned planning patterns from deterministic fixtures', () => {
    render(<MemoryRouter>{renderProductPatternPreview('feature-card')}</MemoryRouter>);
    expect(screen.getAllByRole('link', { name: 'Review local planning changes' })).toHaveLength(3);
    expect(screen.getByText('backlog')).toBeInTheDocument();
  });

  it('renders feature-owned delivery patterns and returns null for unknown IDs', () => {
    render(renderProductPatternPreview('verification-summary'));
    expect(screen.getByText('sha256:scoped')).toBeInTheDocument();
    expect(renderProductPatternPreview('unknown-pattern')).toBeNull();
  });
});
