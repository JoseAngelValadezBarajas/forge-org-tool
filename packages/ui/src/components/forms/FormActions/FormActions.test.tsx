import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { FormActions } from './FormActions';
describe('FormActions', () => {
  it('exposes caller-selected layout and preserves action children', () => {
    render(
      <FormActions align="between">
        <button>Back</button>
        <button>Save</button>
      </FormActions>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' }).parentElement).toHaveAttribute(
      'data-align',
      'between',
    );
  });

  it('renders disabled save and cancel actions while saving', () => {
    const { container } = render(
      <FormActions state="saving" onCancel={() => {}} onSave={() => {}} />,
    );

    expect(within(container).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(container).getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('disables both native actions in the read-only state', () => {
    const { container } = render(
      <FormActions state="readOnly" onCancel={() => {}} onSave={() => {}} />,
    );

    expect(within(container).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(container).getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
