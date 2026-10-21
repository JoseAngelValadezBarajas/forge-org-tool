import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';
import { TextInput } from '../TextInput';
describe('FormField', () => {
  it('links label, hint, and validation message to its control', () => {
    render(
      <FormField label="Workspace" hint="Shared name" error="Required">
        <TextInput />
      </FormField>,
    );
    const input = screen.getByRole('textbox', { name: 'Workspace' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('propagates required and disabled to the native control', () => {
    const { container } = render(
      <FormField label="Feature title" required disabled>
        <TextInput />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Feature title' });
    expect(screen.getByLabelText('Feature title')).toBe(input);
    expect(input).toBeRequired();
    expect(input).toBeDisabled();
    expect(container.querySelector('label span[aria-hidden="true"]')).toBeEmptyDOMElement();
  });
});
