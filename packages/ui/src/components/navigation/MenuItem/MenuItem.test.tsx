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

  it('exposes the canonical selected state accessibly and visually', () => {
    render(<MenuItem selected>Current view</MenuItem>);
    const item = screen.getByRole('menuitem', { name: 'Current view' });
    expect(item).toHaveAttribute('aria-current', 'true');
    expect(item).toHaveAttribute('data-selected', 'true');
  });
});
