import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Toast } from './Toast';
describe('Toast', () => {
  it('announces informational messages without interruptive alert semantics', () => {
    render(<Toast tone="info">Saved draft</Toast>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved draft');
  });
});
