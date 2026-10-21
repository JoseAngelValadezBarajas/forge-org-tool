import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { MultiSelect } from './MultiSelect';

describe('MultiSelect', () => {
  it('provides native multi-selection and disabled options', () => {
    render(
      <MultiSelect
        aria-label="Members"
        options={[
          { value: 'a', label: 'Ada' },
          { value: 'b', label: 'Ben', disabled: true },
        ]}
      />,
    );
    expect(screen.getByRole('listbox', { name: 'Members' })).toHaveAttribute('multiple');
    expect(screen.getByRole('option', { name: 'Ben' })).toBeDisabled();
  });
});
