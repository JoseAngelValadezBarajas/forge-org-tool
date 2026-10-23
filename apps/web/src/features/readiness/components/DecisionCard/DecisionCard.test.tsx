import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { DecisionCard } from './DecisionCard';

describe('DecisionCard', () => {
  it('shows decision revision and status alongside supplied actions', () => {
    render(
      <DecisionCard title="Use SQLite" revision={2} status="ACCEPTED">
        <button>History</button>
      </DecisionCard>,
    );
    expect(screen.getByRole('article', { name: 'Use SQLite' })).toHaveTextContent('Revision 2');
    expect(screen.getByRole('article')).toHaveTextContent('ACCEPTED');
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
  });
});
