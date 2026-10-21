import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { ProvenanceNotice } from './ProvenanceNotice';
it('makes human-reported provenance and its limits explicit', () => {
  render(<ProvenanceNotice source="Operator report" />);
  expect(screen.getByRole('note')).toHaveTextContent('Operator report');
  expect(screen.getByRole('note')).toHaveTextContent('not independently verified');
});
