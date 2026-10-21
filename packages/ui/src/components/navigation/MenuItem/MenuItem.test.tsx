import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { MenuItem } from './MenuItem';
describe('MenuItem', () => {
  it('activates as a menu item and respects disabled state', () => {
    const action = vi.fn();
    render(
      <div role="menu">
        <MenuItem onSelect={action}>Rename</MenuItem>
        <MenuItem disabled>Delete</MenuItem>
      </div>,
    );
    screen.getByRole('menuitem', { name: 'Rename' }).click();
    expect(action).toHaveBeenCalledOnce();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
