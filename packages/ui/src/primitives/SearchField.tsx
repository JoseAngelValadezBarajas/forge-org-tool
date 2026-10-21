import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Shared.module.css';

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="search"
      {...props}
      className={[styles.control, className].filter(Boolean).join(' ')}
    />
  );
});
