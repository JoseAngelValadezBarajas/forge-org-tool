import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, 'aria-invalid': ariaInvalid, ...props },
  ref,
) {
  const invalid = ariaInvalid === true || ariaInvalid === 'true';
  return (
    <select
      {...props}
      aria-invalid={ariaInvalid}
      ref={ref}
      className={[styles.select, invalid && styles.invalid, className].filter(Boolean).join(' ')}
    />
  );
});
