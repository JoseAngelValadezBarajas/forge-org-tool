import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';
describe('Tooltip', () => {
  it('associates tooltip text with its focusable trigger', () => {
    render(
      <Tooltip content="Copies the link">
        <button>Copy</button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Copy' });
    const tooltip = screen.getByRole('tooltip');
    expect(button.getAttribute('aria-describedby')?.split(' ')).toContain(tooltip.id);
  });
});
