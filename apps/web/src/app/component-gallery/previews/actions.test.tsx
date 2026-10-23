// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderActionPreview } from './actions';

describe('action category previews', () => {
  afterEach(cleanup);

  it('renders the shared Button and wires its action to the host counter', () => {
    const onIncrement = vi.fn();
    render(renderActionPreview('button', { count: 4, onIncrement }));

    fireEvent.click(screen.getByRole('button', { name: 'Increment 4' }));
    expect(onIncrement).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Working/ })).toHaveAttribute('aria-busy', 'true');
  });

  it('renders every supported Button size from the public package', () => {
    render(renderActionPreview('button-size', { count: 0, onIncrement: vi.fn() }));

    expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument();
  });

  it('renders named IconButton states and returns no preview for unrelated IDs', () => {
    render(renderActionPreview('icon-button', { count: 0, onIncrement: vi.fn() }));

    expect(screen.getByRole('button', { name: 'Add item' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Loading item' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Unavailable item' })).toBeDisabled();
    expect(renderActionPreview('card', { count: 0, onIncrement: vi.fn() })).toBeNull();
  });
});
