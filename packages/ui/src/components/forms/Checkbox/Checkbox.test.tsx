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
});
