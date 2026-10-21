import { forwardRef, useId, useState, type ChangeEvent, type SelectHTMLAttributes } from 'react';
import { Checkbox } from '../Checkbox';
import styles from './MultiSelect.module.css';

export type MultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type MultiSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'multiple' | 'value' | 'defaultValue'
> & {
  options?: readonly MultiSelectOption[];
  presentation?: 'native' | 'checkboxList';
  label?: string;
  emptyMessage?: string;
  value?: string | readonly string[];
  defaultValue?: string | readonly string[];
  onValuesChange?: (values: string[]) => void;
};

export const MultiSelect = forwardRef<HTMLSelectElement, MultiSelectProps>(function MultiSelect(
  {
    options = [],
    presentation = 'native',
    label,
    emptyMessage = 'None available',
    className,
    children,
    value,
    defaultValue,
    onChange,
    onValuesChange,
    disabled,
    name,
    required,
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const listId = id ?? generatedId;
  const isControlled = value !== undefined;
  const [uncontrolledValues, setUncontrolledValues] = useState<string[]>(() =>
    normalizeValues(defaultValue),
  );
  const selectedValues = isControlled ? normalizeValues(value) : uncontrolledValues;

  const selectProps: SelectHTMLAttributes<HTMLSelectElement> = {
    ...props,
    id: listId,
    name: presentation === 'native' ? name : undefined,
    required: presentation === 'native' ? required : undefined,
    disabled,
    onChange,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  };

  if (presentation === 'native') {
    return (
      <select
        {...selectProps}
        ref={ref}
        multiple
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        className={[styles.control, className].filter(Boolean).join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    );
  }

  const handleOptionChange = (option: MultiSelectOption, event: ChangeEvent<HTMLInputElement>) => {
    if (disabled || option.disabled) return;
    const nextValues = event.currentTarget.checked
      ? [...selectedValues, option.value]
      : selectedValues.filter((selectedValue) => selectedValue !== option.value);
    if (!isControlled) setUncontrolledValues(nextValues);
    onValuesChange?.(nextValues);
  };

  return (
    <>
      <fieldset
        id={listId}
        className={[styles.group, className].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        aria-required={required || undefined}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        {label && <legend className={styles.legend}>{label}</legend>}
        {options.length > 0 ? (
          options.map((option) => (
            <label className={styles.option} key={option.value}>
              <Checkbox
                checked={selectedValues.includes(option.value)}
                disabled={disabled || option.disabled}
                onChange={(event) => handleOptionChange(option, event)}
                name={name}
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))
        ) : (
          <p className={styles.empty} role="status">
            {emptyMessage}
          </p>
        )}
      </fieldset>
      <select
        {...selectProps}
        ref={ref}
        id={undefined}
        multiple
        tabIndex={-1}
        aria-hidden="true"
        className={styles.nativeValue}
        value={selectedValues}
        onChange={() => undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
});

function normalizeValues(value: string | readonly string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value as string];
}
