import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import styles from './FilePicker.module.css';

export type FilePickerState = 'empty' | 'selected' | 'error';
export type FilePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  title?: string;
  description?: string;
  metadata?: string;
  state?: FilePickerState;
};

export const FilePicker = forwardRef<HTMLInputElement, FilePickerProps>(function FilePicker(
  {
    className,
    id,
    title = 'Choose file',
    description = 'Browse for a local file.',
    metadata,
    state = 'empty',
    disabled,
    'aria-describedby': ariaDescribedBy,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ');

  return (
    <div
      className={[styles.root, disabled && styles.disabled, className].filter(Boolean).join(' ')}
      data-state={state}
    >
      <label className={styles.title} htmlFor={inputId}>
        {title}
      </label>
      <p
        id={descriptionId}
        className={[styles.description, state === 'error' && styles.error]
          .filter(Boolean)
          .join(' ')}
        role={state === 'error' ? 'alert' : undefined}
      >
        {description}
      </p>
      {metadata && <p className={styles.metadata}>{metadata}</p>}
      <input
        {...inputProps}
        ref={ref}
        id={inputId}
        type="file"
        disabled={disabled}
        aria-invalid={state === 'error' ? true : inputProps['aria-invalid']}
        aria-describedby={describedBy}
        className={styles.input}
      />
    </div>
  );
});
