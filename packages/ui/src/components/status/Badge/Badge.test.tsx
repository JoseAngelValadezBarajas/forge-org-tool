import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';
describe('Badge', () => {
  it('preserves badge text content and native attributes', () => {
    render(
      <Badge tone="warning" aria-label="2 pending">
        2
      </Badge>,
    );
    expect(screen.getByLabelText('2 pending')).toHaveTextContent('2');
  });

  it('supports the canonical informational tone separately from accent', () => {
    render(<Badge tone="info">Optional</Badge>);
    expect(screen.getByText('Optional')).toHaveAttribute('data-tone', 'info');
  });
});
