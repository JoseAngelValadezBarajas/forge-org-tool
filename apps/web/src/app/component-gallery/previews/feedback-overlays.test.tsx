// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFeedbackPreview } from './feedback-overlays';

describe('feedback and overlay previews', () => {
  afterEach(cleanup);

  it('renders feedback states and loading content', () => {
    render(
      <>
        {renderFeedbackPreview('alert')}
        {renderFeedbackPreview('progress')}
      </>,
    );
    expect(screen.getAllByText('Context available')).toHaveLength(4);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('opens and dismisses a real confirmation dialog', () => {
    render(renderFeedbackPreview('dialog'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview confirm dialog' }));
    expect(screen.getByRole('dialog', { name: 'Confirm transfer' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
