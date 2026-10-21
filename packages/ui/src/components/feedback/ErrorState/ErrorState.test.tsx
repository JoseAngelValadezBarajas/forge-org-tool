import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { ErrorState } from './ErrorState';

afterEach(cleanup);

it('announces an error and renders explanatory copy and recovery actions', () => {
  render(
    <ErrorState title="Unable to load" description="Try again." actions={<button>Retry</button>} />,
  );

  expect(screen.getByRole('alert', { name: 'Unable to load' })).toHaveTextContent('Try again.');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});
