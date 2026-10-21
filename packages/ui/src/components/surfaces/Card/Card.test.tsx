import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';
describe('Card', () => {
  it('defaults to neutral div semantics and permits explicit landmark semantics', () => {
    const { rerender } = render(<Card data-testid="card">Body</Card>);
    expect(screen.getByTestId('card').tagName).toBe('DIV');
    rerender(
      <Card as="article" aria-label="Summary">
        Body
      </Card>,
    );
    expect(screen.getByRole('article', { name: 'Summary' })).toBeInTheDocument();
  });

  it('exposes the canonical elevated visual variant without changing root semantics', () => {
    render(
      <Card variant="elevated" data-testid="elevated-card">
        Summary
      </Card>,
    );
    expect(screen.getByTestId('elevated-card')).toHaveAttribute('data-variant', 'elevated');
    expect(screen.getByTestId('elevated-card').tagName).toBe('DIV');
  });
});
