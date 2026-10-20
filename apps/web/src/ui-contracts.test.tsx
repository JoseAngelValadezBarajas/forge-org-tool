import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Button, Card } from '@forge-org/ui';

describe('public shared component contracts', () => {
  it('renders Card as a neutral div by default and forwards native props and refs', () => {
    const ref = createRef<HTMLDivElement>();

    render(<Card ref={ref} className="custom-card" aria-label="Default card" data-testid="default-card">Content</Card>);

    const card = screen.getByTestId('default-card');
    expect(card.tagName).toBe('DIV');
    expect(card).toHaveClass('custom-card');
    expect(card).toHaveAttribute('aria-label', 'Default card');
    expect(ref.current).toBe(card);
  });

  it('allows a justified semantic Card root without requiring section semantics', () => {
    render(<Card as="section" aria-label="Semantic card">Content</Card>);

    expect(screen.getByRole('region', { name: 'Semantic card' })).toBeInTheDocument();
  });

  it('preserves Button disabled, loading, and pressed DOM contracts', () => {
    render(<Button loading aria-pressed="true">Save</Button>);

    const button = screen.getByRole('button', { name: /working/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
