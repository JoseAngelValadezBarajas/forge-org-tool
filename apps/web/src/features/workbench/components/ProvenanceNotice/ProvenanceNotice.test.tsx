import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { ProvenanceNotice } from './ProvenanceNotice';

afterEach(cleanup);

it('makes human-reported provenance and its limits explicit', () => {
  render(<ProvenanceNotice source="Operator report" />);
  expect(screen.getByRole('note')).toHaveTextContent('Operator report');
  expect(screen.getByRole('note')).toHaveTextContent('not independently verified');
});

it.each([
  ['Observed', 'OBSERVED'],
  ['Unknown', 'UNKNOWN'],
] as const)('represents the %s provenance state without claiming verification', (state, label) => {
  render(<ProvenanceNotice source="Host observation" state={state} />);

  const note = screen.getByRole('note');
  expect(note).toHaveAttribute('data-state', state);
  expect(note).toHaveTextContent(label);
  expect(note).toHaveTextContent('Host observation');
  expect(note).not.toHaveTextContent('independently verified');
});
