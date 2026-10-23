import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Popover } from './Popover';
describe('Popover', () => {
  it('uses a native disclosure control with an accessible trigger', () => {
    const { container } = render(<Popover trigger="Actions">Rename</Popover>);
    expect(container.querySelector('summary')).toHaveTextContent('Actions');
    expect(screen.getByText('Rename')).toBeInTheDocument();
  });

  it('supports an explicitly open native details state', () => {
    const { container } = render(
      <Popover open trigger="Expanded details">
        Additional details
      </Popover>,
    );
    expect(container.querySelector('details')).toHaveAttribute('open');
  });
});
