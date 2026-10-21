import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';
describe('Select', () => {
  it('uses native selection and keeps selected option behavior', () => {
    render(
      <>
        <label htmlFor="environment">Environment</label>
        <Select id="environment" defaultValue="prod">
          <option value="dev">Development</option>
          <option value="prod">Production</option>
        </Select>
      </>,
    );
    expect(screen.getByRole('combobox', { name: 'Environment' })).toHaveValue('prod');
  });
});
