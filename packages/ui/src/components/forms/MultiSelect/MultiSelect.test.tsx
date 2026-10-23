import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
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

  it('supports the canonical checkbox-list selection state', () => {
    const onValuesChange = vi.fn();
    render(
      <MultiSelect
        presentation="checkboxList"
        label="Saved records"
        aria-invalid="true"
        options={[
          { value: 'a', label: 'Ada' },
          { value: 'b', label: 'Ben' },
        ]}
        defaultValue={['a']}
        onValuesChange={onValuesChange}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Ada' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Saved records' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ben' }));
    expect(onValuesChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('announces when the canonical checkbox list has no available options', () => {
    render(<MultiSelect presentation="checkboxList" label="Saved records" options={[]} />);

    expect(screen.getByText('None available')).toBeInTheDocument();
  });
});
