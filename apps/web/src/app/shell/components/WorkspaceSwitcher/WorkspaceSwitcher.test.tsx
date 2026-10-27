import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it, vi } from 'vitest';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
it('shows an accessible menu and reports a real selection change', () => {
  const onChange = vi.fn();
  const onManage = vi.fn();
  render(
    <WorkspaceSwitcher
      value="w1"
      workspaces={[
        { id: 'w1', name: 'Local' },
        { id: 'w2', name: 'Research' },
      ]}
      onChange={onChange}
      onManage={onManage}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Workspace: Local' }));
  const menu = screen.getByRole('menu', { name: 'Workspaces' });
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Research' }));
  expect(onChange).toHaveBeenCalledWith('w2');
  expect(screen.queryByRole('menu', { name: 'Workspaces' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Workspace: Local' }));
  fireEvent.click(
    within(screen.getByRole('menu', { name: 'Workspaces' })).getByRole('menuitem', {
      name: 'Manage workspaces',
    }),
  );
  expect(onManage).toHaveBeenCalledOnce();
});

it('keeps the compact workspace menu accessible', () => {
  render(
    <WorkspaceSwitcher
      compact
      value="w1"
      workspaces={[{ id: 'w1', name: 'Local' }]}
      onChange={vi.fn()}
      onManage={vi.fn()}
    />,
  );

  expect(screen.getByTestId('workspace-compact-control')).toBeInTheDocument();
  expect(
    within(screen.getByTestId('workspace-compact-control')).getByRole('button', {
      name: 'Workspace: Local',
    }),
  ).toBeInTheDocument();
});
