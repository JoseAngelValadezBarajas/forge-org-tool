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

  it('renders the shared SectionHeader counter and action composition', () => {
    render(renderSurfaceDataPreview('section-header'));
    expect(screen.getByRole('heading', { name: 'SectionHeader' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders metric and badge examples from the owned surface module', () => {
    render(
      <>
        {renderSurfaceDataPreview('metric-card')}
        {renderSurfaceDataPreview('badge')}
      </>,
    );
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });
});
