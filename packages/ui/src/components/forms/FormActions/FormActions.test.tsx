import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { FormActions } from './FormActions';
describe('FormActions', () => {
  it('exposes caller-selected layout and preserves action children', () => {
    render(
      <FormActions align="between">
        <button>Back</button>
        <button>Save</button>
      </FormActions>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' }).parentElement).toHaveAttribute(
      'data-align',
      'between',
    );
  });
});
