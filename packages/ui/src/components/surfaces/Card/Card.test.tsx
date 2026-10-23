import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
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

  it('forwards typed semantic refs, native props and consumer classes to its root', () => {
    const ref = createRef<HTMLElement>();
    const select = vi.fn();
    render(
      <Card
        as="section"
        ref={ref}
        aria-label="Summary"
        id="summary"
        tabIndex={0}
        className="consumer-card"
        onClick={select}
      >
        Body
      </Card>,
    );
    const card = screen.getByRole('region', { name: 'Summary' });
    expect(ref.current).toBe(card);
    expect(card).toHaveAttribute('id', 'summary');
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveClass('consumer-card');
    fireEvent.click(card);
    expect(select).toHaveBeenCalledOnce();
  });
});
