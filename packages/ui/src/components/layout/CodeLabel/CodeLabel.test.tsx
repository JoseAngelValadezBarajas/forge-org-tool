import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { CodeLabel } from './CodeLabel';
describe('CodeLabel', () => {
  it('uses code semantics and preserves long technical identifiers', () => {
    render(<CodeLabel>FEAT-012 · HEAD 31ae903</CodeLabel>);
    expect(screen.getByText('FEAT-012 · HEAD 31ae903').tagName).toBe('CODE');
  });
});
