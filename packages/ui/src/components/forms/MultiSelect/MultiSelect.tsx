import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './MultiSelect.module.css';

export type MultiSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple'> & {
  options?: readonly { value: string; label: string; disabled?: boolean }[];
};

export const MultiSelect = forwardRef<HTMLSelectElement, MultiSelectProps>(function MultiSelect(
  { options, className, children, ...props },
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      multiple
      className={[styles.control, className].filter(Boolean).join(' ')}
    >
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
});
