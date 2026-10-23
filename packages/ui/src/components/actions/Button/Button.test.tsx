import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
describe('Button', () => {
  it('supports the integrated size variant and loading disables activation', () => {
    render(
      <Button size="small" loading>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Working…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('retains the action label while announcing the loading label and blocks activation', () => {
    const activate = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <Button ref={ref} loading loadingLabel="Saving feature" onClick={activate}>
        Save feature
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving feature' });
    expect(screen.getByText('Save feature')).toBeVisible();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(ref.current).toBe(button);
    fireEvent.click(button);
    expect(activate).not.toHaveBeenCalled();

    rerender(<Button onClick={activate}>Save feature</Button>);
    const ready = screen.getByRole('button', { name: 'Save feature' });
    expect(ready).not.toBeDisabled();
    expect(ready).not.toHaveAttribute('aria-busy');
    expect(ready).toHaveAttribute('type', 'button');
    fireEvent.click(ready);
    expect(activate).toHaveBeenCalledOnce();
  });

  it('preserves native props, caller naming and an explicit disabled state after loading', () => {
    const ref = createRef<HTMLButtonElement>();
    const activate = vi.fn();
    const props = {
      ref,
      disabled: true,
      onClick: activate,
      type: 'submit' as const,
      name: 'action',
      value: 'remove',
      form: 'editor',
      className: 'consumer-button',
      'aria-label': 'Remove selected item',
    };
    const { rerender } = render(
      <Button {...props} loading>
        Remove item
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Remove selected item' });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'action');
    expect(button).toHaveAttribute('value', 'remove');
    expect(button).toHaveAttribute('form', 'editor');
    expect(button).toHaveClass('consumer-button');
    rerender(<Button {...props}>Remove item</Button>);
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    fireEvent.click(button);
    expect(activate).not.toHaveBeenCalled();
  });
});
