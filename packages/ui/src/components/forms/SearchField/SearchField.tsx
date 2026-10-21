import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './SearchField.module.css';
export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="search"
      className={[styles.search, className].filter(Boolean).join(' ')}
    />
  );
});
