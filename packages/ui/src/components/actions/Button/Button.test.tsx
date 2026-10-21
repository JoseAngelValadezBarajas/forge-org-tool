import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
describe('Button', () => {
  it('supports the integrated size variant and loading disables activation', () => {
    render(
      <Button size="small" loading>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Working…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
