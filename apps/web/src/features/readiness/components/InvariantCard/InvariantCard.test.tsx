import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { InvariantCard } from './InvariantCard';

describe('InvariantCard', () => {
  it('distinguishes current from acknowledged revision and keeps the action slot', () => {
    render(
      <InvariantCard title="No fabrication" revision={3} acknowledgedRevision={2}>
        <button>Acknowledge</button>
      </InvariantCard>,
    );
    expect(screen.getByRole('article', { name: 'No fabrication' })).toHaveTextContent('Revision 3');
    expect(screen.getByText('Acknowledgement required for current revision')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('preserves the acknowledged revision label for audit context', () => {
    render(<InvariantCard title="No fabrication" revision={3} acknowledgedRevision={3} />);

    expect(screen.getByText('Acknowledged revision 3')).toBeInTheDocument();
  });
});
