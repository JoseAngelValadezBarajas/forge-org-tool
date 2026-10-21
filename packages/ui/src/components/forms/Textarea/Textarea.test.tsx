import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Textarea } from './Textarea';
describe('Textarea', () => {
  it('preserves multiline native input and accessible naming', () => {
    render(<Textarea aria-label="Description" rows={4} />);
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAttribute('rows', '4');
  });
});
