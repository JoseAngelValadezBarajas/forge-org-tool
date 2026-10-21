import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './FilePicker.module.css';

export type FilePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;
export const FilePicker = forwardRef<HTMLInputElement, FilePickerProps>(function FilePicker(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="file"
      className={[styles.input, className].filter(Boolean).join(' ')}
    />
  );
});
