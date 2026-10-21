import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it, vi } from 'vitest';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
it('shows the current workspace and reports a real selection change', () => {
  const onChange = vi.fn();
  render(
    <WorkspaceSwitcher
      value="w1"
      workspaces={[
        { id: 'w1', name: 'Local' },
        { id: 'w2', name: 'Research' },
      ]}
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Workspace' }), {
    target: { value: 'w2' },
  });
  expect(onChange).toHaveBeenCalledWith('w2');
});
