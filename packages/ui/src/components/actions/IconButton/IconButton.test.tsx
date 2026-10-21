import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { IconButton } from './IconButton';
describe('IconButton', () => {
  it('requires an accessible name and disables itself while loading', () => {
    render(
      <IconButton aria-label="Add item" loading>
        +
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
  });
});
