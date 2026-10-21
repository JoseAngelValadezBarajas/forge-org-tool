import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';
describe('Switch', () => {
  it('is a labeled, keyboard-operable native checkbox switch', () => {
    render(
      <>
        <label htmlFor="enable-sync">Enable sync</label>
        <Switch id="enable-sync" defaultChecked />
      </>,
    );
    const control = screen.getByRole('switch', { name: 'Enable sync' });
    expect(control).toBeChecked();
    expect(control).toHaveAttribute('type', 'checkbox');
  });
});
