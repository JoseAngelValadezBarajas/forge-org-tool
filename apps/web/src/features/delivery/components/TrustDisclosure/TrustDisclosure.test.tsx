import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { TrustDisclosure } from './TrustDisclosure';

afterEach(cleanup);

it('communicates delivery trust boundaries', () => {
  render(<TrustDisclosure>Not published or deployed.</TrustDisclosure>);
  expect(screen.getByRole('note')).toHaveTextContent('Not published or deployed.');
});

it.each([
  ['Default', 'DEFAULT'],
  ['Expanded', 'EXPANDED'],
] as const)('renders the canonical %s trust disclosure state', (state, label) => {
  render(<TrustDisclosure state={state}>References alone are not proof.</TrustDisclosure>);

  const note = screen.getByRole('note');
  expect(note).toHaveAttribute('data-state', state);
  expect(note).toHaveTextContent(label);
  expect(note).toHaveTextContent('REPORTED is not VERIFIED');
  expect(note).toHaveTextContent('References alone are not proof.');
});
