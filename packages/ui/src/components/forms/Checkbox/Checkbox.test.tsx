import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './Checkbox';
describe('Checkbox', () => {
  it('supports checked state and a native accessible label', () => {
    render(
      <>
        <label htmlFor="terms">Accept terms</label>
        <Checkbox id="terms" defaultChecked />
      </>,
    );
    expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeChecked();
  });

  it('reflects the indeterminate state on the native checkbox and resets it', () => {
    const { rerender } = render(<Checkbox aria-label="Select all" indeterminate />);
    const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
    expect(checkbox).toHaveProperty('indeterminate', true);
    expect(checkbox).not.toBeChecked();

    rerender(<Checkbox aria-label="Select all" indeterminate={false} />);
    expect(checkbox).toHaveProperty('indeterminate', false);
  });
});
