import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { TrustDisclosure } from './TrustDisclosure';
it('communicates delivery trust boundaries', () => {
  render(<TrustDisclosure>Not published or deployed.</TrustDisclosure>);
  expect(screen.getByRole('note')).toHaveTextContent('Not published or deployed.');
});
