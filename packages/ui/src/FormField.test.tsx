import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { FormField } from './primitives/FormField';
import { Input } from './primitives/Input';

describe('FormField accessibility contract', () => {
  it('generates a unique control id and connects label, hint, and error', () => {
    render(
      <FormField label="Workspace name" hint="Shown to collaborators" error="Required">
        <Input />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Workspace name' });
    const hint = screen.getByText('Shown to collaborators');
    const error = screen.getByText('Required');

    expect(input).toHaveAttribute('id');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(
      expect.arrayContaining([hint.id, error.id]),
    );
    expect(hint.id).not.toBe(error.id);
    expect(screen.getByLabelText('Workspace name')).toBe(input);
  });

  it('preserves an explicit control id and existing description relationship', () => {
    render(
      <FormField label="Repository" htmlFor="repository-id" hint="Git URL">
        <Input id="repository-id" aria-describedby="external-help" />
      </FormField>,
    );

    const input = screen.getByLabelText('Repository');
    expect(input).toHaveAttribute('id', 'repository-id');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(
      expect.arrayContaining(['external-help']),
    );
  });
});
