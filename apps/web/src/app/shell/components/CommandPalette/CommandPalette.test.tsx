import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

afterEach(cleanup);
it('filters commands and runs the selected command', () => {
  const onSelect = vi.fn();
  render(
    <CommandPalette
      open
      onClose={() => {}}
      commands={[
        { id: 'org', label: 'Organization', onSelect },
        { id: 'host', label: 'Component host', onSelect },
      ]}
    />,
  );
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search commands' }), {
    target: { value: 'host' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Go to Component host' }));
  expect(onSelect).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Organization' })).not.toBeInTheDocument();
});

it('closes on Escape and returns focus to the opening control', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Open palette';
  document.body.append(trigger);
  trigger.focus();
  const onClose = vi.fn();
  const { unmount, rerender } = render(<CommandPalette open onClose={onClose} commands={[]} />);
  const input = screen.getByRole('searchbox', { name: 'Search commands' });
  expect(input).toHaveFocus();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
  rerender(<CommandPalette open={false} onClose={onClose} commands={[]} />);
  expect(trigger).toHaveFocus();
  trigger.remove();
  unmount();
});
