import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';
describe('Alert', () => {
  it('uses assertive alert semantics for danger messages', () => {
    render(<Alert tone="danger">Action failed</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Action failed');
  });

  it('exposes the canonical Error tone with assertive alert semantics', () => {
    const { container } = render(<Alert tone="error">Action failed</Alert>);
    const alert = container.firstElementChild;
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('supports the canonical heading and message composition', () => {
    render(<Alert tone="info" heading="Context available" message="Source reviewed." />);

    expect(screen.getByText('Context available')).toBeInTheDocument();
    expect(screen.getByText('Source reviewed.')).toBeInTheDocument();
  });
});
