import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { StatePanel } from './StatePanel';
describe('StatePanel', () => {
  it('announces state and provides retry actions in error state', () => {
    render(<StatePanel kind="error" title="Could not load" action={<button>Retry</button>} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
