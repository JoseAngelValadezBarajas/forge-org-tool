// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderNavigationPreview } from './navigation';

describe('navigation category previews', () => {
  afterEach(cleanup);

  it('renders accessible tabs and navigates between their content', () => {
    render(renderNavigationPreview('tabs', vi.fn()));
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
  });

  it('wires menu item selection and ignores unrelated IDs', () => {
    const onSelect = vi.fn();
    render(renderNavigationPreview('menu-item', onSelect));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Refresh data' }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(renderNavigationPreview('card', onSelect)).toBeNull();
  });
});
