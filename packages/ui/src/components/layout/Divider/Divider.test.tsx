import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Divider } from './Divider';
describe('Divider', () => {
  it('exposes a decorative horizontal separator by default', () => {
    const { container } = render(<Divider />);
    expect(container.firstElementChild).toHaveAttribute('role', 'separator');
    expect(container.firstElementChild).toHaveAttribute('aria-orientation', 'horizontal');
  });
});
