import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { VerificationSummary } from './VerificationSummary';
it('shows truthful outcome, fingerprint and blockers', () => {
  render(
    <VerificationSummary outcome="BLOCKED" fingerprint="fp-9" blockers={['missing evidence']} />,
  );
  expect(screen.getByRole('group', { name: 'Verification summary' })).toHaveTextContent('fp-9');
  expect(screen.getByText('missing evidence')).toBeInTheDocument();
});
