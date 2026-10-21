import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Textarea } from './Textarea';
describe('Textarea', () => {
  it('preserves multiline native input and accessible naming', () => {
    render(<Textarea aria-label="Description" rows={4} />);
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAttribute('rows', '4');
  });

  it('marks the canonical error state for its visual treatment', () => {
    render(<Textarea aria-label="Outcome" aria-invalid="true" />);

    const textarea = screen.getByRole('textbox', { name: 'Outcome' });
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea.className).toMatch(/invalid/);
  });
});
