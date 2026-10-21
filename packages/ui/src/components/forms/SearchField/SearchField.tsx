import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react';
import { Close, Search } from '@forge-org/icons';
import styles from './SearchField.module.css';

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  clearable?: boolean;
  clearLabel?: string;
  onClear?: () => void;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    className,
    clearable = true,
    clearLabel = 'Clear search',
    disabled,
    onChange,
    onClear,
    value,
    defaultValue,
    ...props
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controlled = value !== undefined;
  const [query, setQuery] = useState(() => String(defaultValue ?? ''));
  const currentQuery = controlled ? String(value ?? '') : query;
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setQuery(event.currentTarget.value);
    onChange?.(event);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    if (!controlled) setQuery('');
    onClear?.();
  };

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-state={disabled ? 'disabled' : currentQuery ? 'withQuery' : 'empty'}
    >
      <Search aria-hidden="true" className={styles.icon} size={16} />
      <input
        {...props}
        ref={inputRef}
        type="search"
        disabled={disabled}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
        onChange={handleChange}
        className={styles.search}
      />
      {clearable && currentQuery && !disabled && (!controlled || onClear) && (
        <button
          type="button"
          className={styles.clear}
          aria-label={clearLabel}
          onClick={handleClear}
        >
          <Close aria-hidden="true" size={14} />
        </button>
      )}
    </div>
  );
});
