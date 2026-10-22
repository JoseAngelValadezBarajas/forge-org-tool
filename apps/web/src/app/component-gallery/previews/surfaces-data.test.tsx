// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { renderSurfaceDataPreview } from './surfaces-data';

describe('surface and data previews', () => {
  afterEach(cleanup);

  it('shows Card surface variants and status tones', () => {
    render(
      <>
        {renderSurfaceDataPreview('card')}
        {renderSurfaceDataPreview('status-chip')}
      </>,
    );
    expect(screen.getByText('Neutral surface')).toBeInTheDocument();
    expect(screen.getByText('Raised surface')).toBeInTheDocument();
    expect(screen.getByText('Reported')).toBeInTheDocument();
  });

  it('renders data table captions and empty state', () => {
    render(renderSurfaceDataPreview('table'));
    expect(screen.getByRole('table', { name: 'Repository inventory' })).toBeInTheDocument();
    expect(screen.getByText('No repositories available.')).toBeInTheDocument();
    expect(renderSurfaceDataPreview('input')).toBeNull();
  });
});
