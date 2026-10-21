import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { EvaluationSnapshot } from './EvaluationSnapshot';

describe('EvaluationSnapshot', () => {
  it('presents the fingerprint as a saved snapshot and marks stale history', () => {
    render(<EvaluationSnapshot fingerprint="fp-123" evaluatedAt="2026-10-20" stale />);
    expect(screen.getByRole('group', { name: 'Evaluation snapshot' })).toHaveTextContent('fp-123');
    expect(screen.getByText('Stale snapshot')).toBeInTheDocument();
  });
});
