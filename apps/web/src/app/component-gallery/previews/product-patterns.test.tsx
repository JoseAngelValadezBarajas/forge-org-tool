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
    expect(screen.getByRole('link', { name: 'Review local planning changes' })).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('returns null for retired and unknown product patterns', () => {
    expect(renderProductPatternPreview('verification-summary')).toBeNull();
    expect(renderProductPatternPreview('unknown-pattern')).toBeNull();
  });

  it('renders the organization-owned empty-state product pattern', () => {
    render(renderProductPatternPreview('organization-empty-state'));
    expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByText('No workspace fixture')).toBeInTheDocument();
  });
});
