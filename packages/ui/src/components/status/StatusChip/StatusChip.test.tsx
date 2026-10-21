import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { StatusChip } from './StatusChip';
describe('StatusChip', () => {
  it('renders a concise status label with a typed semantic tone', () => {
    render(<StatusChip tone="success">Connected</StatusChip>);
    expect(screen.getByText('Connected').tagName).toBe('SPAN');
  });

  it.each(['info', 'reported'] as const)(
    'supports the Figma %s tone distinctly from accent',
    (tone) => {
      const { container } = render(<StatusChip tone={tone}>Evidence status</StatusChip>);
      expect(container.firstElementChild).toHaveAttribute('data-tone', tone);
    },
  );
});
