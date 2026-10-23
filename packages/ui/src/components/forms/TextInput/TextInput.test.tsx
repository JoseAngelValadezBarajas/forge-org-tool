import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { TextInput } from './TextInput';
describe('TextInput', () => {
  it('preserves native validation and error semantics', () => {
    render(<TextInput aria-label="Repository URL" aria-invalid="true" required />);
    expect(screen.getByRole('textbox', { name: 'Repository URL' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
