import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { LoadingState } from './LoadingState';

afterEach(cleanup);

it('announces loading by label and preserves native attributes and consumer class', () => {
  render(
    <LoadingState label="Loading projects" className="consumer-layout" data-testid="loading" />,
  );

  const status = screen.getByRole('status', { name: 'Loading projects' });
  expect(status).toHaveAttribute('data-testid', 'loading');
  expect(status).toHaveClass('consumer-layout');
});
